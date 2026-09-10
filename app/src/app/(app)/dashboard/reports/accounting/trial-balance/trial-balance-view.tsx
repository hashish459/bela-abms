"use client";

import { Card, PageHeader } from "@/components/ui";

type TBRow = {
  ledgerId: string; code: string; name: string;
  groupName: string; headName: string; accountType: string;
  debit: string; credit: string; closing: string; closingType: string;
};
type TB = {
  rows: TBRow[];
  totals: { debit: string; credit: string };
};

const TYPE_ORDER = ["AS", "EX", "LI", "EQ", "IN"];
const TYPE_LABEL: Record<string, string> = {
  AS: "Assets", EX: "Expenses", LI: "Liabilities", EQ: "Equity", IN: "Income",
};

export function TrialBalanceView({ fyName, data }: { fyName: string; data: TB }) {
  const rows = data.rows;
  const balanced = data.totals.debit === data.totals.credit;

  const byHead = new Map<string, TBRow[]>();
  for (const r of rows) {
    const k = `${r.accountType}||${r.headName}`;
    if (!byHead.has(k)) byHead.set(k, []);
    byHead.get(k)!.push(r);
  }
  const groups = [...byHead.entries()].sort((a, b) => {
    const [ta] = a[0].split("||");
    const [tb] = b[0].split("||");
    return TYPE_ORDER.indexOf(ta) - TYPE_ORDER.indexOf(tb) || a[0].localeCompare(b[0]);
  });

  return (
    <>
      <PageHeader
        crumbs={["Reports", "Accounting", "Trial Balance"]}
        title="Trial Balance"
        action={
          <button
            onClick={() => window.print()}
            className="rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-border hover:bg-accent-tint"
          >
            Print
          </button>
        }
      />
      <p className="mb-3 text-sm text-muted">
        Fiscal year <strong>{fyName}</strong> · opening balances + period movement, read
        directly from the general ledger.
      </p>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-xs text-muted">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Account</th>
              <th className="px-4 py-2 text-right font-medium">Debit (Rs)</th>
              <th className="px-4 py-2 text-right font-medium">Credit (Rs)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {groups.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-muted">
                  No transactions posted yet. Create a journal voucher or an invoice.
                </td>
              </tr>
            )}
            {groups.flatMap(([key, list]) => {
              const [type, head] = key.split("||");
              return [
                <tr key={`${key}-h`} className="bg-background/60">
                  <td
                    colSpan={3}
                    className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted"
                  >
                    {TYPE_LABEL[type]} · {head}
                  </td>
                </tr>,
                ...list.map((r) => (
                  <tr key={r.ledgerId} className="hover:bg-accent-tint">
                    <td className="px-4 py-2">
                      <span className="pl-3">{r.name}</span>
                      <span className="ml-2 text-xs text-muted">{r.code}</span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.debit !== "0.00" ? r.debit : ""}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.credit !== "0.00" ? r.credit : ""}
                    </td>
                  </tr>
                )),
              ];
            })}
          </tbody>
          <tfoot className="border-t-2 border-border bg-background font-semibold">
            <tr>
              <td className="px-4 py-2.5 text-right">Total</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.debit}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.credit}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      <p className={`mt-3 text-sm ${balanced ? "text-success" : "text-danger"}`}>
        {balanced
          ? "✓ Debits equal credits — the ledger is in balance."
          : "⚠ Debits and credits do not match — investigate."}
      </p>
    </>
  );
}
