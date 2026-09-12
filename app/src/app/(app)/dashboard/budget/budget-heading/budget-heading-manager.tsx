"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast } from "@/components/ui";

type Heading = {
  id: string; name: string; sourceType: string; isActive: boolean;
  accountGroupId: string | null; accountGroupName: string | null;
};
type Group = { id: string; label: string };

export function BudgetHeadingManager({
  initial, groups, canCreate, canUpdate, canDelete,
}: { initial: Heading[]; groups: Group[]; canCreate: boolean; canUpdate: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Heading | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(h: Heading) {
    if (!confirm(`Delete budget heading "${h.name}"?`)) return;
    const res = await api(`/api/budget/headings/${h.id}`, { method: "DELETE" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Budget heading deleted");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Budget", "Budget Heading"]}
        title="Budget Heading"
        action={canCreate && <Button onClick={() => setCreating(true)}><Plus size={15} /> Add heading</Button>}
      />
      <p className="mb-3 text-sm text-muted">
        Budgetable line items. Link one to a Chart of Accounts group to get its actual spend
        computed automatically in the Budget vs Expense Report; a manual heading has no
        automatic actual/variance.
      </p>

      {initial.length === 0 ? (
        <EmptyState title="No budget headings yet" hint="Add a category to budget against." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Account Group</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-2.5 font-medium">{h.name}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{h.sourceType === "COA_GROUP" ? "Chart of Accounts" : "Manual"}</td>
                  <td className="px-4 py-2.5 text-muted">{h.accountGroupName ?? "—"}</td>
                  <td className="px-4 py-2.5">{h.isActive ? <span className="text-success">Active</span> : <span className="text-muted">Inactive</span>}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {canUpdate && <Button variant="ghost" onClick={() => setEditing(h)}><Pencil size={14} /></Button>}
                      {canDelete && <Button variant="ghost" onClick={() => remove(h)}><Trash2 size={14} className="text-danger" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {(creating || editing) && (
        <HeadingForm
          heading={editing}
          groups={groups}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function HeadingForm({
  heading, groups, onClose, onSaved,
}: { heading: Heading | null; groups: Group[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(heading?.name ?? "");
  const [sourceType, setSourceType] = useState<"MANUAL" | "COA_GROUP">((heading?.sourceType as "MANUAL" | "COA_GROUP") ?? "MANUAL");
  const [accountGroupId, setAccountGroupId] = useState(heading?.accountGroupId ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast("Name is required", "err");
    if (sourceType === "COA_GROUP" && !accountGroupId) return toast("Select an account group", "err");
    setSaving(true);
    const res = await api(heading ? `/api/budget/headings/${heading.id}` : "/api/budget/headings", {
      method: heading ? "PATCH" : "POST",
      body: JSON.stringify({ name, sourceType, accountGroupId: sourceType === "COA_GROUP" ? accountGroupId : undefined }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(heading ? "Heading updated" : "Heading added");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={heading ? "Update budget heading" : "Add budget heading"}>
      <div className="space-y-3">
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Marketing Expenses" />
        </Field>
        <Field label="Source" required>
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value as "MANUAL" | "COA_GROUP")} className={inputClass}>
            <option value="MANUAL">Manual (no GL tie)</option>
            <option value="COA_GROUP">Chart of Accounts group</option>
          </select>
        </Field>
        {sourceType === "COA_GROUP" && (
          <Field label="Account group" required>
            <select value={accountGroupId} onChange={(e) => setAccountGroupId(e.target.value)} className={inputClass}>
              <option value="">Select…</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </Field>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
