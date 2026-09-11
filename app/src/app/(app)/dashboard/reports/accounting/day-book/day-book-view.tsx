"use client";

import { useEffect, useState } from "react";
import { api, Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { adToBs } from "@/lib/bs-date";

type Line = { ledgerCode: string; ledgerName: string; debit: string; credit: string; narration: string };
type VoucherRow = { id: string; number: string; date: string; type: string; narration: string; lines: Line[] };
type DayBook = { vouchers: VoucherRow[]; totals: { debit: string; credit: string } };

export function DayBookView({ defaultDate }: { defaultDate: string }) {
  const [date, setDate] = useState(defaultDate);
  const [data, setData] = useState<DayBook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api<DayBook>(`/api/reports/day-book?date=${date}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [date]);

  return (
    <>
      <PageHeader
        crumbs={["Reports", "Accounting", "Day Book"]}
        title="Day Book"
        action={
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
        }
      />
      <p className="mb-3 text-sm text-muted">Every voucher posted on the selected day, in order.</p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Date (AD)" hint={`BS ${adToBs(date)}`}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      {loading || !data ? (
        <Card className="p-10 text-center text-sm text-muted">Loading…</Card>
      ) : data.vouchers.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">No vouchers posted on this date.</Card>
      ) : (
        <>
          <Card className="mb-4 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Voucher</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Account</th>
                  <th className="px-4 py-2 text-right font-medium">Debit</th>
                  <th className="px-4 py-2 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.vouchers.flatMap((v) => [
                  <tr key={`${v.id}-h`} className="bg-background/60">
                    <td colSpan={5} className="px-4 py-1.5 text-xs font-semibold text-muted">
                      {v.number} · {v.narration || "—"}
                    </td>
                  </tr>,
                  ...v.lines.map((l, i) => (
                    <tr key={`${v.id}-${i}`} className="hover:bg-accent-tint">
                      <td className="px-4 py-2" />
                      <td className="px-4 py-2 text-muted">{v.type}</td>
                      <td className="px-4 py-2">
                        {l.ledgerName}
                        <span className="ml-2 text-xs text-muted">{l.ledgerCode}</span>
                        {l.narration && <span className="ml-2 text-xs text-muted">— {l.narration}</span>}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{l.debit !== "0.00" ? l.debit : ""}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{l.credit !== "0.00" ? l.credit : ""}</td>
                    </tr>
                  )),
                ])}
              </tbody>
              <tfoot className="border-t-2 border-border bg-background font-semibold">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-right">
                    Total
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.debit}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.credit}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
