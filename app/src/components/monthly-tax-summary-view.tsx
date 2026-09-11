"use client";

import { useEffect, useState } from "react";
import { api, Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

type Row = { month: string; salesTaxable: string; outputVat: string; purchaseTaxable: string; inputVat: string; netPayable: string };
type Data = { rows: Row[] };

const MONTH_LABEL = (m: string) => {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export function MonthlyTaxSummaryView({ fyName, defaultFrom, defaultTo }: { fyName: string; defaultFrom: string; defaultTo: string }) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api<Data>(`/api/reports/monthly-tax-summary?from=${from}&to=${to}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [from, to]);

  return (
    <>
      <PageHeader crumbs={["Reports", "Tax", "Monthly Tax Summary"]} title="Monthly Tax Summary" action={<PrintButton />} />
      <p className="mb-3 text-sm text-muted">
        Fiscal year <strong>{fyName}</strong> · output vs input VAT, bucketed by calendar month.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3" data-app-chrome>
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>

      {loading || !data ? (
        <Card className="p-10 text-center text-sm text-muted">Loading…</Card>
      ) : data.rows.length === 0 ? (
        <EmptyState title="No tax activity" hint="Try a wider date range." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Month</th>
                <th className="px-4 py-2 text-right font-medium">Sales Taxable</th>
                <th className="px-4 py-2 text-right font-medium">Output VAT</th>
                <th className="px-4 py-2 text-right font-medium">Purchase Taxable</th>
                <th className="px-4 py-2 text-right font-medium">Input VAT</th>
                <th className="px-4 py-2 text-right font-medium">Net Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.map((r) => (
                <tr key={r.month} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5 font-medium">{MONTH_LABEL(r.month)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.salesTaxable}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.outputVat}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.purchaseTaxable}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.inputVat}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${Number(r.netPayable) < 0 ? "text-success" : ""}`}>
                    {r.netPayable}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
