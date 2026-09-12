"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, EmptyState, PageHeader, inputClass } from "@/components/ui";

type Row = {
  id: string; number: string; date: string; customer: string;
  grandTotal: string; outstanding: string; daysOverdue: number;
};
type List = { rows: Row[]; total: string };

export function ReceivableWorkspace({ initial }: { initial: List }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [list, setList] = useState<List>(initial);

  useEffect(() => {
    const t = setTimeout(async () => {
      const qs = new URLSearchParams(search ? { search } : {});
      const res = await fetch(`/api/sales/receivables?${qs}`);
      const json = await res.json();
      if (json.ok) setList(json.data);
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <>
      <PageHeader crumbs={["Sales", "Receivable Amount"]} title="Receivable Amount" />
      <p className="mb-3 text-xs text-muted">
        Outstanding sales invoices, oldest first. Net of any Credit Notes already applied.
      </p>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search invoice no. or customer"
        className={`mb-3 max-w-sm ${inputClass}`}
      />

      {list.rows.length === 0 ? (
        <EmptyState title="Nothing outstanding" hint="Every sales invoice is fully paid." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Invoice No.</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 text-right font-medium">Invoice Total</th>
                <th className="px-4 py-2 text-right font-medium">Outstanding</th>
                <th className="px-4 py-2 text-right font-medium">Days Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/dashboard/sales/invoice/${r.id}`)}
                  className="cursor-pointer hover:bg-accent-tint"
                >
                  <td className="px-4 py-2.5">{r.date}</td>
                  <td className="px-4 py-2.5 font-medium">{r.number}</td>
                  <td className="px-4 py-2.5">{r.customer}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.grandTotal}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{r.outstanding}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${r.daysOverdue > 30 ? "text-danger" : "text-muted"}`}>
                    {r.daysOverdue}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border text-sm font-semibold">
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right">Total outstanding</td>
                <td className="px-4 py-2 text-right tabular-nums">{list.total}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </>
  );
}
