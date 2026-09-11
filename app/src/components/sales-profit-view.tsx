"use client";

import { useEffect, useState } from "react";
import { api, Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

type Row = { id: string; number: string; date: string; party: string; sales: string; cogs: string; profit: string; marginPct: string };
type Data = { rows: Row[]; totals: { sales: string; cogs: string; profit: string; marginPct: string } };

export function SalesProfitView() {
  const nowDate = new Date();
  const monthAgoDate = new Date(nowDate);
  monthAgoDate.setDate(monthAgoDate.getDate() - 30);
  const today = nowDate.toISOString().slice(0, 10);
  const monthAgo = monthAgoDate.toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api<Data>(`/api/reports/sales-profit?from=${from}&to=${to}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [from, to]);

  return (
    <>
      <PageHeader crumbs={["Reports", "Sales", "Sales Profit Report"]} title="Sales Profit Report" action={<PrintButton />} />
      <p className="mb-3 text-xs text-muted">
        Gross profit per invoice: ex-VAT sale value less the weighted-average cost of goods sold
        at the time of sale.
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
        <EmptyState title="No invoices in this range" hint="Try a wider date range." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Invoice No.</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 text-right font-medium">Sales</th>
                <th className="px-4 py-2 text-right font-medium">COGS</th>
                <th className="px-4 py-2 text-right font-medium">Profit</th>
                <th className="px-4 py-2 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">{r.date}</td>
                  <td className="px-4 py-2.5 font-medium">{r.number}</td>
                  <td className="px-4 py-2.5">{r.party}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.sales}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.cogs}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${Number(r.profit) < 0 ? "text-danger" : "text-success"}`}>{r.profit}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.marginPct}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-background font-semibold">
              <tr>
                <td colSpan={3} className="px-4 py-2.5 text-right">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.sales}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.cogs}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.profit}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.marginPct}%</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </>
  );
}
