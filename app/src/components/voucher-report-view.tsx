"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { api, Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

type Line = { ledgerCode: string; ledgerName: string; debit: string; credit: string; narration: string };
type Row = { id: string; number: string; date: string; narration: string; amount: string; lines: Line[] };
type Data = { rows: Row[]; totalAmount: string };

export function VoucherReportView({
  title,
  crumb,
  apiPath,
}: {
  title: string;
  crumb: string;
  apiPath: string;
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
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const sep = apiPath.includes("?") ? "&" : "?";
      api<Data>(`${apiPath}${sep}from=${from}&to=${to}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [apiPath, from, to]);

  return (
    <>
      <PageHeader
        crumbs={["Reports", crumb, title]}
        title={title}
        action={<PrintButton />}
      />
      <p className="mb-3 text-xs text-muted">Click a row to see its ledger-wise entries.</p>

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
        <EmptyState title={`No ${title.toLowerCase()} entries`} hint="Try a wider date range." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="w-8 px-2 py-2" />
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Voucher No.</th>
                <th className="px-4 py-2 font-medium">Narration</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.map((v) => (
                <Fragment key={v.id}>
                  <tr
                    onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                    className="cursor-pointer hover:bg-accent-tint"
                  >
                    <td className="px-2 py-2.5 text-muted">
                      {expanded === v.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="px-4 py-2.5">{v.date}</td>
                    <td className="px-4 py-2.5 font-medium">{v.number}</td>
                    <td className="px-4 py-2.5 text-muted">{v.narration || "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{v.amount}</td>
                  </tr>
                  {expanded === v.id && (
                    <tr>
                      <td colSpan={5} className="bg-background px-4 py-3">
                        <table className="w-full text-xs">
                          <thead className="text-muted">
                            <tr>
                              <th className="pb-1 text-left font-medium">Ledger</th>
                              <th className="pb-1 text-right font-medium">Debit</th>
                              <th className="pb-1 text-right font-medium">Credit</th>
                              <th className="pb-1 text-left font-medium">Narration</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {v.lines.map((l, i) => (
                              <tr key={i}>
                                <td className="py-1">
                                  {l.ledgerName} <span className="text-muted">{l.ledgerCode}</span>
                                </td>
                                <td className="py-1 text-right tabular-nums">{l.debit !== "0.00" ? l.debit : ""}</td>
                                <td className="py-1 text-right tabular-nums">{l.credit !== "0.00" ? l.credit : ""}</td>
                                <td className="py-1 text-muted">{l.narration}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-background font-semibold">
              <tr>
                <td colSpan={4} className="px-4 py-2.5 text-right">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totalAmount}</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </>
  );
}
