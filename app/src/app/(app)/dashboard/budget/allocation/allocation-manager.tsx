"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, Button, Card, EmptyState, Field, PageHeader, inputClass, toast } from "@/components/ui";

type Row = { budgetHeadingId: string; name: string; sourceType: string; accountGroupName: string | null; amount: string };
type Data = { budget: { id: string; name: string; fiscalYearName: string; fundName: string | null }; rows: Row[] };
type BudgetOpt = { id: string; name: string };

export function AllocationManager({
  budgets, selectedBudgetId, data, canUpdate,
}: { budgets: BudgetOpt[]; selectedBudgetId: string; data: Data | null; canUpdate: boolean }) {
  const router = useRouter();
  const [amounts, setAmounts] = useState<Record<string, string>>(
    () => Object.fromEntries((data?.rows ?? []).map((r) => [r.budgetHeadingId, r.amount])),
  );
  const [saving, setSaving] = useState(false);

  function selectBudget(id: string) {
    router.push(id ? `/dashboard/budget/allocation?budgetId=${id}` : "/dashboard/budget/allocation");
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    const res = await api(`/api/budget/budgets/${data.budget.id}/allocations`, {
      method: "PUT",
      body: JSON.stringify({
        allocations: Object.entries(amounts).map(([budgetHeadingId, amount]) => ({ budgetHeadingId, amount: Number(amount) || 0 })),
      }),
    });
    setSaving(false);
    if (!res.ok) return toast(res.error.message, "err");
    toast("Allocations saved");
    router.refresh();
  }

  const total = Object.values(amounts).reduce((a, v) => a + (Number(v) || 0), 0);

  return (
    <>
      <PageHeader crumbs={["Budget", "Allocation"]} title="Allocation" />
      <p className="mb-3 text-sm text-muted">Set the amount budgeted for each heading within a budget.</p>

      <div className="mb-4 max-w-sm">
        <Field label="Budget">
          <select value={selectedBudgetId} onChange={(e) => selectBudget(e.target.value)} className={inputClass}>
            <option value="">Select a budget…</option>
            {budgets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
      </div>

      {!data ? (
        <EmptyState title="No budget selected" hint="Pick a budget above to edit its allocations." />
      ) : data.rows.length === 0 ? (
        <EmptyState title="No budget headings yet" hint="Add one under the Budget Heading tab first." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Heading</th>
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((r) => (
                  <tr key={r.budgetHeadingId}>
                    <td className="px-4 py-2.5 font-medium">{r.name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">{r.accountGroupName ?? "Manual"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amounts[r.budgetHeadingId] ?? "0.00"}
                        disabled={!canUpdate}
                        onChange={(e) => setAmounts((a) => ({ ...a, [r.budgetHeadingId]: e.target.value }))}
                        className={`${inputClass} w-32 text-right`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border bg-background font-semibold">
                <tr>
                  <td colSpan={2} className="px-4 py-2.5 text-right">Total</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
          {canUpdate && (
            <div className="mt-3 flex justify-end">
              <Button loading={saving} onClick={save}>Save allocations</Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
