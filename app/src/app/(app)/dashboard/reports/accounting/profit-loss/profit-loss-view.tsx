"use client";

import { useEffect, useState } from "react";
import { api, Button, Card, Field, Input, PageHeader } from "@/components/ui";

type PLRow = { ledgerId: string; code: string; name: string; headName: string; amount: string };
type PL = { income: PLRow[]; expense: PLRow[]; totalIncome: string; totalExpense: string; netProfit: string };

function groupByHead(rows: PLRow[]) {
  const byHead = new Map<string, PLRow[]>();
  for (const r of rows) {
    if (!byHead.has(r.headName)) byHead.set(r.headName, []);
    byHead.get(r.headName)!.push(r);
  }
  return [...byHead.entries()];
}

export function ProfitLossView({
  fyName,
  defaultFrom,
  defaultTo,
}: {
  fyName: string;
  defaultFrom: string;
  defaultTo: string;
}) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [data, setData] = useState<PL | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api<PL>(`/api/reports/profit-loss?from=${from}&to=${to}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [from, to]);

  const profit = data ? Number(data.netProfit) >= 0 : true;

  return (
    <>
      <PageHeader
        crumbs={["Reports", "Accounting", "Profit & Loss"]}
        title="Statement of Profit & Loss"
        action={
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
        }
      />
      <p className="mb-3 text-sm text-muted">
        Fiscal year <strong>{fyName}</strong> · income and expense movement for the selected period.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>

      {loading || !data ? (
        <Card className="p-10 text-center text-sm text-muted">Loading…</Card>
      ) : (
        <>
          <Card className="mb-4 overflow-hidden">
            <div className="border-b border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Income
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {data.income.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-muted">No income posted in this period.</td>
                  </tr>
                )}
                {groupByHead(data.income).map(([head, rows]) => (
                  <tr key={head} className="align-top">
                    <td className="px-4 py-2.5 text-muted">{head}</td>
                    <td className="px-4 py-2.5">
                      {rows.map((r) => (
                        <div key={r.ledgerId} className="flex justify-between gap-4">
                          <span>{r.name}</span>
                          <span className="tabular-nums">{r.amount}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border bg-background font-semibold">
                <tr>
                  <td className="px-4 py-2.5">Total Income</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{data.totalIncome}</td>
                </tr>
              </tfoot>
            </table>
          </Card>

          <Card className="mb-4 overflow-hidden">
            <div className="border-b border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Expense
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {data.expense.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-muted">No expense posted in this period.</td>
                  </tr>
                )}
                {groupByHead(data.expense).map(([head, rows]) => (
                  <tr key={head} className="align-top">
                    <td className="px-4 py-2.5 text-muted">{head}</td>
                    <td className="px-4 py-2.5">
                      {rows.map((r) => (
                        <div key={r.ledgerId} className="flex justify-between gap-4">
                          <span>{r.name}</span>
                          <span className="tabular-nums">{r.amount}</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border bg-background font-semibold">
                <tr>
                  <td className="px-4 py-2.5">Total Expense</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{data.totalExpense}</td>
                </tr>
              </tfoot>
            </table>
          </Card>

          <Card className={`p-4 text-right ${profit ? "text-success" : "text-danger"}`}>
            <span className="text-sm font-medium">{profit ? "Net Profit" : "Net Loss"}: </span>
            <span className="text-lg font-semibold tabular-nums">Rs. {data.netProfit}</span>
          </Card>
        </>
      )}
    </>
  );
}
