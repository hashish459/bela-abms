"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, toast } from "@/components/ui";

type Fund = { id: string; name: string; isActive: boolean };

export function FundManager({
  initial, canCreate, canUpdate, canDelete,
}: { initial: Fund[]; canCreate: boolean; canUpdate: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Fund | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(f: Fund) {
    if (!confirm(`Delete fund "${f.name}"?`)) return;
    const res = await api(`/api/budget/funds/${f.id}`, { method: "DELETE" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Fund deleted");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Budget", "Fund"]}
        title="Fund"
        action={canCreate && <Button onClick={() => setCreating(true)}><Plus size={15} /> Add fund</Button>}
      />
      <p className="mb-3 text-sm text-muted">
        Internal funding sources for a budget — e.g. a term loan or retained earnings backing
        a capex plan. Assign one to a Budget to record where its money comes from.
      </p>

      {initial.length === 0 ? (
        <EmptyState title="No funds yet" hint="Add a funding source for capex/expansion budgets." />
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
              {initial.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-2.5 font-medium">{f.name}</td>
                  <td className="px-4 py-2.5">{f.isActive ? <span className="text-success">Active</span> : <span className="text-muted">Inactive</span>}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate && <Button variant="ghost" onClick={() => setEditing(f)}><Pencil size={14} /></Button>}
                      {canDelete && <Button variant="ghost" onClick={() => remove(f)}><Trash2 size={14} className="text-danger" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {(creating || editing) && (
        <FundForm
          fund={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function FundForm({ fund, onClose, onSaved }: { fund: Fund | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(fund?.name ?? "");
  const [isActive, setIsActive] = useState(fund?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast("Name is required", "err");
    setSaving(true);
    const res = await api(fund ? `/api/budget/funds/${fund.id}` : "/api/budget/funds", {
      method: fund ? "PATCH" : "POST",
      body: JSON.stringify(fund ? { name, isActive } : { name }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(fund ? "Fund updated" : "Fund added");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={fund ? "Update fund" : "Add fund"}>
      <div className="space-y-3">
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Term Loan — NIC Bank" />
        </Field>
        {fund && (
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
