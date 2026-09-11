"use client";

import { useEffect, useState } from "react";
import { api, Button, Card, Field, Input, PageHeader } from "@/components/ui";

type AgingRow = {
  partyId: string; partyName: string;
  current: string; d31to60: string; d61to90: string; over90: string; total: string;
};
type Aging = {
  rows: AgingRow[];
  totals: { current: string; d31to60: string; d61to90: string; over90: string; total: string };
};

export function AgingView({
  title,
  crumb,
  apiPath,
  partyLabel,
}: {
  title: string;
  crumb: string;
  apiPath: string;
  partyLabel: string;
}) {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<Aging | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api<Aging>(`${apiPath}?asOf=${asOf}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [apiPath, asOf]);

  return (
    <>
      <PageHeader
        crumbs={["Reports", crumb, title]}
        title={title}
        action={
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
        }
      />
      <p className="mb-3 text-sm text-muted">Outstanding balance per {partyLabel.toLowerCase()}, bucketed by age.</p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="As of">
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </Field>
      </div>

      {loading || !data ? (
        <Card className="p-10 text-center text-sm text-muted">Loading…</Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{partyLabel}</th>
                <th className="px-4 py-2 text-right font-medium">0–30 days</th>
                <th className="px-4 py-2 text-right font-medium">31–60 days</th>
                <th className="px-4 py-2 text-right font-medium">61–90 days</th>
                <th className="px-4 py-2 text-right font-medium">90+ days</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    Nothing outstanding as of this date.
                  </td>
                </tr>
              )}
              {data.rows.map((r) => (
                <tr key={r.partyId} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5 font-medium">{r.partyName}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.current !== "0.00" ? r.current : ""}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.d31to60 !== "0.00" ? r.d31to60 : ""}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.d61to90 !== "0.00" ? r.d61to90 : ""}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-danger">
                    {r.over90 !== "0.00" ? r.over90 : ""}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">{r.total}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-background font-semibold">
              <tr>
                <td className="px-4 py-2.5">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.current}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.d31to60}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.d61to90}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.over90}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.total}</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </>
  );
}
