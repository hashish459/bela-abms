"use client";

import { useEffect, useState } from "react";
import { api, Card, EmptyState, Field, PageHeader, inputClass } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

type Row = {
  budgetHeadingId: string; name: string; sourceType: string;
  allocated: string; actual: string | null; variance: string | null; utilizationPct: string | null;
};
type Data = {
  budget: { id: string; name: string; fiscalYearName: string };
  rows: Row[];
  totals: { allocated: string; actual: string; variance: string };
};
type BudgetOpt = { id: string; name: string };

export function BudgetVsExpenseView({ budgets }: { budgets: BudgetOpt[] }) {
  const [budgetId, setBudgetId] = useState(budgets[0]?.id ?? "");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!budgetId) {
        setData(null);
        return;
      }
      setLoading(true);
      api<Data>(`/api/reports/budget-vs-expense?budgetId=${budgetId}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [budgetId]);

  return (
    <>
      <PageHeader crumbs={["Reports", "Budget", "Budget vs Expense Report"]} title="Budget vs Expense Report" action={<PrintButton />} />
      <p className="mb-3 text-xs text-muted">
        Actual spend is computed only for headings linked to a Chart of Accounts group —
        manual headings show no actual/variance.
      </p>

      <div className="mb-4 max-w-sm" data-app-chrome>
        <Field label="Budget">
          <select value={budgetId} onChange={(e) => setBudgetId(e.target.value)} className={inputClass}>
            <option value="">Select a budget…</option>
            {budgets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
      </div>

      {!budgetId ? (
        <EmptyState title="No budget selected" hint="Pick a budget above." />
      ) : loading || !data ? (
        <Card className="p-10 text-center text-sm text-muted">Loading…</Card>
      ) : data.rows.length === 0 ? (
        <EmptyState title="No allocations yet" hint="Set amounts under Budget › Allocation first." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Heading</th>
                <th className="px-4 py-2 text-right font-medium">Allocated</th>
                <th className="px-4 py-2 text-right font-medium">Actual</th>
                <th className="px-4 py-2 text-right font-medium">Variance</th>
                <th className="px-4 py-2 text-right font-medium">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.map((r) => (
                <tr key={r.budgetHeadingId} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5 font-medium">{r.name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.allocated}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.actual ?? "—"}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${r.variance !== null && Number(r.variance) < 0 ? "text-danger" : ""}`}>
                    {r.variance ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.utilizationPct !== null ? `${r.utilizationPct}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-background font-semibold">
              <tr>
                <td className="px-4 py-2.5 text-right">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.allocated}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.actual}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${Number(data.totals.variance) < 0 ? "text-danger" : ""}`}>{data.totals.variance}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </>
  );
}
