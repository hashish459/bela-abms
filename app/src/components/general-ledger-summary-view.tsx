"use client";

import { useEffect, useState } from "react";
import { api, Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

type Row = {
  ledgerId: string; code: string; name: string; groupName: string; headName: string; accountType: string;
  opening: string; openingType: string; debit: string; credit: string; closing: string; closingType: string;
};
type Data = { rows: Row[]; totals: { openingDr: string; debit: string; credit: string; closingDr: string } };

export function GeneralLedgerSummaryView() {
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
      api<Data>(`/api/reports/general-ledger-summary?from=${from}&to=${to}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [from, to]);

  return (
    <>
      <PageHeader crumbs={["Reports", "Accounting", "General Ledger Summary"]} title="General Ledger Summary" action={<PrintButton />} />
      <p className="mb-3 text-xs text-muted">
        Opening balance, period movement, and closing balance per ledger — unlike Trial Balance
        (always cumulative as of one date), this is scoped to the date range below.
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
        <EmptyState title="No movement" hint="Try a wider date range." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Ledger</th>
                <th className="px-4 py-2 text-right font-medium">Opening</th>
                <th className="px-4 py-2 text-right font-medium">Debit</th>
                <th className="px-4 py-2 text-right font-medium">Credit</th>
                <th className="px-4 py-2 text-right font-medium">Closing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.map((r) => (
                <tr key={r.ledgerId} className="hover:bg-accent-tint">
                  <td className="px-4 py-2">
                    <div>{r.name} <span className="text-xs text-muted">{r.code}</span></div>
                    <div className="text-xs text-muted">{r.headName} · {r.groupName}</div>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.opening} {r.openingType}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.debit !== "0.00" ? r.debit : ""}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.credit !== "0.00" ? r.credit : ""}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">{r.closing} {r.closingType}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-background font-semibold">
              <tr>
                <td className="px-4 py-2.5 text-right">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.openingDr}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.debit}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.credit}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.closingDr}</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </>
  );
}
