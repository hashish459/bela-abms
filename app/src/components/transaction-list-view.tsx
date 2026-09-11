"use client";

import { useEffect, useState } from "react";
import { api, Card, EmptyState, Field, Input, PageHeader, inputClass } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

type Row = {
  lineId: string; voucherId: string; voucherNumber: string; voucherType: string;
  date: string; ledgerCode: string; ledgerName: string; debit: string; credit: string; narration: string;
};
type Data = { rows: Row[]; total: number; page: number; pageSize: number };
type Ledger = { id: string; name: string; code: string };

export function TransactionListView({ ledgers }: { ledgers: Ledger[] }) {
  const nowDate = new Date();
  const monthAgoDate = new Date(nowDate);
  monthAgoDate.setDate(monthAgoDate.getDate() - 30);
  const today = nowDate.toISOString().slice(0, 10);
  const monthAgo = monthAgoDate.toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [ledgerId, setLedgerId] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({ from, to, page: String(page) });
      if (ledgerId) params.set("ledgerId", ledgerId);
      api<Data>(`/api/reports/transaction-list?${params}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [from, to, ledgerId, page]);

  const totalDebit = data?.rows.reduce((a, r) => a + Number(r.debit), 0) ?? 0;
  const totalCredit = data?.rows.reduce((a, r) => a + Number(r.credit), 0) ?? 0;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader crumbs={["Reports", "Accounting", "Transaction List"]} title="Transaction List" action={<PrintButton />} />
      <p className="mb-3 text-xs text-muted">
        Every posted ledger line in the selected range — the most granular accounting report.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3" data-app-chrome>
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </Field>
        <Field label="Ledger">
          <select value={ledgerId} onChange={(e) => { setLedgerId(e.target.value); setPage(1); }} className={inputClass}>
            <option value="">All ledgers</option>
            {ledgers.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
            ))}
          </select>
        </Field>
      </div>

      {loading || !data ? (
        <Card className="p-10 text-center text-sm text-muted">Loading…</Card>
      ) : data.rows.length === 0 ? (
        <EmptyState title="No transactions" hint="Try a wider date range or clear the ledger filter." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Voucher No.</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Ledger</th>
                  <th className="px-4 py-2 font-medium">Narration</th>
                  <th className="px-4 py-2 text-right font-medium">Debit</th>
                  <th className="px-4 py-2 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((r) => (
                  <tr key={r.lineId} className="hover:bg-accent-tint">
                    <td className="px-4 py-2">{r.date}</td>
                    <td className="px-4 py-2 font-medium">{r.voucherNumber}</td>
                    <td className="px-4 py-2 text-xs text-muted">{r.voucherType.replace("_", " ")}</td>
                    <td className="px-4 py-2">{r.ledgerName} <span className="text-xs text-muted">{r.ledgerCode}</span></td>
                    <td className="px-4 py-2 text-muted">{r.narration || "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.debit !== "0.00" ? r.debit : ""}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{r.credit !== "0.00" ? r.credit : ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border bg-background font-semibold">
                <tr>
                  <td colSpan={5} className="px-4 py-2.5 text-right">Page total</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{totalDebit.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{totalCredit.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
          {pages > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm text-muted" data-app-chrome>
              <span>Page {data.page} of {pages} · {data.total} lines</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg px-3 py-1.5 ring-1 ring-border disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg px-3 py-1.5 ring-1 ring-border disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
