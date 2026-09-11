"use client";

import { useEffect, useState } from "react";
import { api, Button, Card, Field, PageHeader } from "@/components/ui";
import { LedgerPicker, type LedgerOption } from "@/components/ledger-picker";
import { adToBs } from "@/lib/bs-date";

type Entry = {
  date: string; number: string; type: string; particulars: string;
  debit: string; credit: string; balance: string; balanceType: "DR" | "CR";
};
type Statement = {
  ledger: { id: string; code: string; name: string };
  entries: Entry[];
  closing: { amount: string; type: "DR" | "CR" };
};

export function LedgerReportView() {
  const [ledger, setLedger] = useState<LedgerOption | null>(null);
  const [data, setData] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!ledger) {
        setData(null);
        return;
      }
      setLoading(true);
      api<Statement>(`/api/reports/ledger/${ledger.id}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [ledger]);

  return (
    <>
      <PageHeader
        crumbs={["Reports", "Accounting", "Ledger"]}
        title="Ledger Report"
        action={
          data && (
            <Button variant="outline" onClick={() => window.print()} data-app-chrome>
              Print
            </Button>
          )
        }
      />
      <p className="mb-3 text-sm text-muted">Running debit/credit statement for a single account.</p>

      <div className="mb-4 max-w-sm">
        <Field label="Account">
          <LedgerPicker value={ledger} onChange={setLedger} placeholder="Search account…" />
        </Field>
      </div>

      {!ledger ? (
        <Card className="p-10 text-center text-sm text-muted">Pick an account to view its statement.</Card>
      ) : loading || !data ? (
        <Card className="p-10 text-center text-sm text-muted">Loading…</Card>
      ) : (
        <>
          <Card className="mb-3 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Voucher</th>
                  <th className="px-4 py-2 font-medium">Particulars</th>
                  <th className="px-4 py-2 text-right font-medium">Debit</th>
                  <th className="px-4 py-2 text-right font-medium">Credit</th>
                  <th className="px-4 py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted">
                      No entries posted to {data.ledger.name} yet.
                    </td>
                  </tr>
                )}
                {data.entries.map((e, i) => (
                  <tr key={i} className="hover:bg-accent-tint">
                    <td className="px-4 py-2.5">
                      {e.date} <span className="text-xs text-muted">(BS {adToBs(e.date)})</span>
                    </td>
                    <td className="px-4 py-2.5 font-medium">{e.number}</td>
                    <td className="px-4 py-2.5 text-muted">{e.particulars || "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{e.debit !== "0.00" ? e.debit : ""}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{e.credit !== "0.00" ? e.credit : ""}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {e.balance} {e.balanceType}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="text-sm font-medium">
            Closing balance: Rs. {data.closing.amount} {data.closing.type}
          </p>
        </>
      )}
    </>
  );
}
