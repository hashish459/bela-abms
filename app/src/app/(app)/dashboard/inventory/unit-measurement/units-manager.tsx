"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { api, Button, Card, Field, Input, Modal, PageHeader, toast } from "@/components/ui";

type Unit = {
  id: string; name: string; shortName: string; description: string | null;
  acceptFraction: boolean; isSystem: boolean; isActive: boolean;
};

export function UnitsManager({
  initial,
  canCreate,
  canUpdate,
}: {
  initial: Unit[];
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Unit | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Inventory", "Units of Measurement"]}
        title="Units of Measurement"
        action={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} /> Add unit
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Symbol</th>
              <th className="px-4 py-2 font-medium">Accepts fraction</th>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {initial.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2.5 font-medium">
                  {u.name}
                  {u.isSystem && (
                    <span className="ml-2 rounded bg-border px-1.5 py-0.5 text-xs text-muted">
                      system
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">{u.shortName}</td>
                <td className="px-4 py-2.5">{u.acceptFraction ? "Yes" : "No"}</td>
                <td className="px-4 py-2.5 text-muted">{u.description || "—"}</td>
                <td className="px-4 py-2.5 text-right">
                  {canUpdate && (
                    <Button variant="ghost" onClick={() => setEditing(u)}>
                      <Pencil size={14} />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {(creating || editing) && (
        <UnitForm
          unit={editing}
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

function UnitForm({
  unit,
  onClose,
  onSaved,
}: {
  unit: Unit | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(unit?.name ?? "");
  const [shortName, setShortName] = useState(unit?.shortName ?? "");
  const [description, setDescription] = useState(unit?.description ?? "");
  const [acceptFraction, setAcceptFraction] = useState(unit?.acceptFraction ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await api(unit ? `/api/inventory/units/${unit.id}` : "/api/inventory/units", {
      method: unit ? "PATCH" : "POST",
      body: JSON.stringify({ name, shortName, description, acceptFraction }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(unit ? "Unit updated" : "Unit added");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={unit ? "Update unit" : "Add unit of measurement"}>
      <div className="space-y-3">
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Kilogram" />
        </Field>
        <Field label="Short name" required>
          <Input value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="Kg" />
        </Field>
        <Field label="Description">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={acceptFraction}
            onChange={(e) => setAcceptFraction(e.target.checked)}
          />
          Accept fractional quantities (e.g. 1.5 kg)
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save} disabled={!name || !shortName}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
