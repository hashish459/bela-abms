"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Warehouse as WhIcon } from "lucide-react";
import { api, Button, Card, Field, Input, Modal, PageHeader, toast } from "@/components/ui";

type WH = {
  id: string; name: string; address: string | null; phone: string | null;
  isDefault: boolean; isActive: boolean;
};

export function WarehouseManager({
  initial,
  canCreate,
  canUpdate,
}: {
  initial: WH[];
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<WH | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Inventory", "Warehouse"]}
        title="Warehouse"
        action={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> New Warehouse
            </Button>
          )
        }
      />
      <Card className="divide-y divide-border">
        {initial.map((w) => (
          <div key={w.id} className="flex items-center gap-4 p-4">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-tint text-accent">
              <WhIcon size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {w.name}
                {w.isDefault && (
                  <span className="rounded bg-accent-tint px-1.5 py-0.5 text-xs text-accent">
                    default
                  </span>
                )}
              </p>
              <p className="text-xs text-muted">
                {w.address || "No address"} {w.phone ? `· ${w.phone}` : ""}
              </p>
            </div>
            {canUpdate && (
              <Button variant="ghost" onClick={() => setEditing(w)}>
                <Pencil size={14} /> Edit
              </Button>
            )}
          </div>
        ))}
      </Card>

      {(creating || editing) && (
        <WarehouseForm
          wh={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function WarehouseForm({
  wh,
  onClose,
  onSaved,
}: {
  wh: WH | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(wh?.name ?? "");
  const [address, setAddress] = useState(wh?.address ?? "");
  const [phone, setPhone] = useState(wh?.phone ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await api(
      wh ? `/api/inventory/warehouses/${wh.id}` : "/api/inventory/warehouses",
      { method: wh ? "PATCH" : "POST", body: JSON.stringify({ name, address, phone }) },
    );
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(wh ? "Warehouse updated" : "Warehouse created");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={wh ? "Update Warehouse" : "New Warehouse"}>
      <div className="space-y-3">
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Address">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Phone No.">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save} disabled={!name}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
