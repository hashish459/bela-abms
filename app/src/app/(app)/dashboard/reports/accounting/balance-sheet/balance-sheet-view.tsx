"use client";

import { useEffect, useState } from "react";
import { api, Button, Card, Field, Input, PageHeader } from "@/components/ui";

type BSRow = { ledgerId: string; code: string; name: string; headName: string; amount: string };
type BS = {
  assets: BSRow[];
  liabilities: BSRow[];
  equity: BSRow[];
  currentYearProfit: string;
  totals: { assets: string; liabilities: string; equity: string; liabilitiesAndEquity: string };
};

function groupByHead(rows: BSRow[]) {
  const byHead = new Map<string, BSRow[]>();
  for (const r of rows) {
    if (!byHead.has(r.headName)) byHead.set(r.headName, []);
    byHead.get(r.headName)!.push(r);
  }
  return [...byHead.entries()];
}

function Side({ title, groups, total }: { title: string; groups: [string, BSRow[]][]; total: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-border">
          {groups.length === 0 && (
            <tr>
              <td className="px-4 py-6 text-center text-muted">Nothing to show.</td>
            </tr>
          )}
          {groups.map(([head, rows]) => (
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
            <td className="px-4 py-2.5">Total</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{total}</td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}

export function BalanceSheetView({ fyName, defaultAsOf }: { fyName: string; defaultAsOf: string }) {
  const [asOf, setAsOf] = useState(defaultAsOf);
  const [data, setData] = useState<BS | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api<BS>(`/api/reports/balance-sheet?asOf=${asOf}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [asOf]);

  const ties = data ? data.totals.assets === data.totals.liabilitiesAndEquity : true;

  return (
    <>
      <PageHeader
        crumbs={["Reports", "Accounting", "Balance Sheet"]}
        title="Statement of Financial Position"
        action={
          <Button variant="outline" onClick={() => window.print()}>
            Print
          </Button>
        }
      />
      <p className="mb-3 text-sm text-muted">
        Fiscal year <strong>{fyName}</strong> · assets vs liabilities + equity, as of the selected date.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="As of">
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </Field>
      </div>

      {loading || !data ? (
        <Card className="p-10 text-center text-sm text-muted">Loading…</Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Side title="Assets" groups={groupByHead(data.assets)} total={data.totals.assets} />
            <div className="space-y-4">
              <Side title="Liabilities" groups={groupByHead(data.liabilities)} total={data.totals.liabilities} />
              <Side
                title="Equity"
                groups={[
                  ...groupByHead(data.equity),
                  ["Current Year", [{ ledgerId: "cyp", code: "", name: "Current Year Profit / (Loss)", headName: "Current Year", amount: data.currentYearProfit }]],
                ]}
                total={data.totals.equity}
              />
            </div>
          </div>

          <p className={`mt-3 text-sm ${ties ? "text-success" : "text-danger"}`}>
            {ties
              ? `✓ Assets (Rs. ${data.totals.assets}) = Liabilities + Equity (Rs. ${data.totals.liabilitiesAndEquity})`
              : `⚠ Assets (Rs. ${data.totals.assets}) ≠ Liabilities + Equity (Rs. ${data.totals.liabilitiesAndEquity}) — investigate.`}
          </p>
        </>
      )}
    </>
  );
}
