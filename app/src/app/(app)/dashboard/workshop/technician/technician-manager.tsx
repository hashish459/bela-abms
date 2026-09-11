"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Wrench } from "lucide-react";
import { api, Button, Card, Field, Input, Modal, PageHeader, Toggle, toast } from "@/components/ui";

type Tech = { id: string; name: string; phone: string | null; specialization: string | null; isActive: boolean };

export function TechnicianManager({
  initial, canCreate, canUpdate,
}: {
  initial: Tech[]; canCreate: boolean; canUpdate: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Tech | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        crumbs={["Workshop", "Technician"]}
        title="Technician"
        action={canCreate && <Button onClick={() => setCreating(true)}><Plus size={15} /> New Technician</Button>}
      />
      <Card className="divide-y divide-border">
        {initial.length === 0 && <p className="p-6 text-center text-sm text-muted">No technicians yet.</p>}
        {initial.map((t) => (
          <div key={t.id} className="flex items-center gap-4 p-4">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-tint text-accent">
              <Wrench size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {t.name}
                {!t.isActive && <span className="rounded bg-danger/10 px-1.5 py-0.5 text-xs text-danger">inactive</span>}
              </p>
              <p className="text-xs text-muted">{t.specialization || "General"} {t.phone ? `· ${t.phone}` : ""}</p>
            </div>
            {canUpdate && (
              <Button variant="ghost" onClick={() => setEditing(t)}><Pencil size={14} /> Edit</Button>
            )}
          </div>
        ))}
      </Card>

      {(creating || editing) && (
        <TechnicianForm
          tech={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function TechnicianForm({ tech, onClose, onSaved }: { tech: Tech | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(tech?.name ?? "");
  const [phone, setPhone] = useState(tech?.phone ?? "");
  const [specialization, setSpecialization] = useState(tech?.specialization ?? "");
  const [isActive, setIsActive] = useState(tech?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await api(
      tech ? `/api/workshop/technicians/${tech.id}` : "/api/workshop/technicians",
      { method: tech ? "PATCH" : "POST", body: JSON.stringify({ name, phone, specialization, ...(tech ? { isActive } : {}) }) },
    );
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(tech ? "Technician updated" : "Technician created");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={tech ? "Update Technician" : "New Technician"}>
      <div className="space-y-3">
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Specialization" hint="e.g. Engine, Electrical, Body Work">
          <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
        </Field>
        {tech && <Toggle checked={isActive} onChange={setIsActive} label="Active" />}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save} disabled={!name}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
