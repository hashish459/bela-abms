"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Pencil, ListChecks } from "lucide-react";
import { api, Button, Card, EmptyState, Field, Input, Modal, PageHeader, inputClass, toast } from "@/components/ui";

type Budget = {
  id: string; name: string; fiscalYearId: string; fiscalYearName: string;
  fundName: string | null; notes: string | null; isActive: boolean; totalAllocated: string;
};
type Opt = { id: string; name: string };

export function BudgetManager({
  initial, fiscalYears, funds, canCreate, canUpdate, canDelete, canAllocate,
}: {
  initial: Budget[]; fiscalYears: Opt[]; funds: Opt[];
  canCreate: boolean; canUpdate: boolean; canDelete: boolean; canAllocate: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Budget | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(b: Budget) {
    if (!confirm(`Delete budget "${b.name}"?`)) return;
    const res = await api(`/api/budget/budgets/${b.id}`, { method: "DELETE" });
    if (!res.ok) return toast(res.error.message, "err");
    toast("Budget deleted");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        crumbs={["Budget", "Budget"]}
        title="Budget"
        action={canCreate && <Button onClick={() => setCreating(true)}><Plus size={15} /> Add budget</Button>}
      />
      <p className="mb-3 text-sm text-muted">
        A budget container per fiscal year. Assign amounts per heading under the Allocation tab.
      </p>

      {initial.length === 0 ? (
        <EmptyState title="No budgets yet" hint="Create a budget for a fiscal year, then allocate amounts to headings." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Fiscal Year</th>
                <th className="px-4 py-2 font-medium">Fund</th>
                <th className="px-4 py-2 text-right font-medium">Total Allocated</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {initial.map((b) => (
                <tr key={b.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5 font-medium">{b.name}</td>
                  <td className="px-4 py-2.5 text-muted">{b.fiscalYearName}</td>
                  <td className="px-4 py-2.5 text-muted">{b.fundName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{b.totalAllocated}</td>
                  <td className="px-4 py-2.5">{b.isActive ? <span className="text-success">Active</span> : <span className="text-muted">Inactive</span>}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      {canAllocate && (
                        <Link href={`/dashboard/budget/allocation?budgetId=${b.id}`}>
                          <Button variant="ghost" title="Edit allocations"><ListChecks size={14} /></Button>
                        </Link>
                      )}
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
        <BudgetForm
          budget={editing}
          fiscalYears={fiscalYears}
          funds={funds}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function BudgetForm({
  budget, fiscalYears, funds, onClose, onSaved,
}: { budget: Budget | null; fiscalYears: Opt[]; funds: Opt[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(budget?.name ?? "");
  const [fiscalYearId, setFiscalYearId] = useState(budget?.fiscalYearId ?? fiscalYears[0]?.id ?? "");
  const [fundId, setFundId] = useState("");
  const [notes, setNotes] = useState(budget?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast("Name is required", "err");
    if (!budget && !fiscalYearId) return toast("Select a fiscal year", "err");
    setSaving(true);
    const res = await api(budget ? `/api/budget/budgets/${budget.id}` : "/api/budget/budgets", {
      method: budget ? "PATCH" : "POST",
      body: JSON.stringify(
        budget ? { name, fundId, notes } : { name, fiscalYearId, fundId, notes },
      ),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast(budget ? "Budget updated" : "Budget added");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={budget ? "Update budget" : "Add budget"}>
      <div className="space-y-3">
        <Field label="Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="FY 2083-84 Operating Budget" />
        </Field>
        {!budget && (
          <Field label="Fiscal year" required>
            <select value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)} className={inputClass}>
              {fiscalYears.map((fy) => <option key={fy.id} value={fy.id}>{fy.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Fund" hint="Optional — internal funding source">
          <select value={fundId} onChange={(e) => setFundId(e.target.value)} className={inputClass}>
            <option value="">— None —</option>
            {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
