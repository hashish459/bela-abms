"use client";

import { useEffect, useState } from "react";
import { api, Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

type Row = {
  id: string; number: string; date: string; party: string;
  receivedIn?: string; paidFrom?: string; against: string; paymentMode: string; reference: string; amount: string;
};
type Data = { rows: Row[]; totalAmount: string };

export function PaymentsReportView({
  title,
  crumb,
  apiPath,
  partyLabel,
  accountLabel,
}: {
  title: string;
  crumb: string;
  apiPath: string;
  partyLabel: string;
  accountLabel: string;
}) {
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
      api<Data>(`${apiPath}?from=${from}&to=${to}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [apiPath, from, to]);

  return (
    <>
      <PageHeader crumbs={["Reports", crumb, title]} title={title} action={<PrintButton />} />

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
        <EmptyState title="Nothing in this range" hint="Try a wider date range." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">No.</th>
                <th className="px-4 py-2 font-medium">{partyLabel}</th>
                <th className="px-4 py-2 font-medium">{accountLabel}</th>
                <th className="px-4 py-2 font-medium">Against</th>
                <th className="px-4 py-2 font-medium">Mode</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5">{r.date}</td>
                  <td className="px-4 py-2.5 font-medium">{r.number}</td>
                  <td className="px-4 py-2.5">{r.party}</td>
                  <td className="px-4 py-2.5 text-muted">{r.receivedIn ?? r.paidFrom}</td>
                  <td className="px-4 py-2.5 text-muted">{r.against}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{r.paymentMode.replace("_", " ")}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{r.amount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-background font-semibold">
              <tr>
                <td colSpan={6} className="px-4 py-2.5 text-right">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totalAmount}</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </>
  );
}
