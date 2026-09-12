"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, toast } from "@/components/ui";

type Bank = { id: string; name: string; isActive: boolean };

export function BanksManager({
  initial,
  canCreate,
  canUpdate,
  canDelete,
}: {
  initial: Bank[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Bank | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(b: Bank) {
    if (!confirm(`Delete bank "${b.name}"?`)) return;
    const res = await api(`/api/settings/banks/${b.id}`, { method: "DELETE" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Bank deleted");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Settings", "Banks"]}
        title="Banks"
        action={canCreate && <Button onClick={() => setCreating(true)}><Plus size={15} /> Add bank</Button>}
      />
      <p className="mb-3 text-sm text-muted">
        Master list of banks used by Bank Detail and party bank records elsewhere in the app.
      </p>

      {initial.length === 0 ? (
        <EmptyState title="No banks yet" hint="Add the banks your company deals with." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2.5 font-medium">{b.name}</td>
                  <td className="px-4 py-2.5">
                    {b.isActive ? <span className="text-success">Active</span> : <span className="text-muted">Inactive</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate && <Button variant="ghost" onClick={() => setEditing(b)}><Pencil size={14} /></Button>}
                      {canDelete && <Button variant="ghost" onClick={() => remove(b)}><Trash2 size={14} className="text-danger" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {(creating || editing) && (
        <BankForm
          bank={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function BankForm({ bank, onClose, onSaved }: { bank: Bank | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(bank?.name ?? "");
  const [isActive, setIsActive] = useState(bank?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast("Name is required", "err");
    setSaving(true);
    const res = await api(bank ? `/api/settings/banks/${bank.id}` : "/api/settings/banks", {
      method: bank ? "PATCH" : "POST",
      body: JSON.stringify(bank ? { name, isActive } : { name }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(bank ? "Bank updated" : "Bank added");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={bank ? "Update bank" : "Add bank"}>
      <div className="space-y-3">
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nepal Investment Bank" />
        </Field>
        {bank && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
