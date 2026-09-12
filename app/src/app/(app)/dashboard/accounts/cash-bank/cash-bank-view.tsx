import { Card, EmptyState, PageHeader } from "@/components/ui";

type Row = { ledgerId: string; code: string; name: string; groupName: string; balance: string; balanceType: string };

export function CashBankView({ rows, hasFiscalYear }: { rows: Row[]; hasFiscalYear: boolean }) {
  const totalDr = rows.filter((r) => r.balanceType === "DR").reduce((a, r) => a + Number(r.balance), 0);
  const totalCr = rows.filter((r) => r.balanceType === "CR").reduce((a, r) => a + Number(r.balance), 0);

  return (
    <>
      <PageHeader crumbs={["Accounts", "Cash & Bank Account"]} title="Cash & Bank Account" />
      <p className="mb-3 text-xs text-muted">
        Live balances for every ledger under Cash &amp; Cash Equivalents (cash-in-hand, bank
        accounts, wallets). To register a new bank account, use Settings › Bank Detail.
      </p>

      {!hasFiscalYear ? (
        <Card className="p-3 text-sm text-danger">Set an active fiscal year in Settings › Fiscal Year first.</Card>
      ) : rows.length === 0 ? (
        <EmptyState title="No cash/bank ledgers yet" hint="Create one under Accounts › Charts of Accounts." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Ledger</th>
                <th className="px-4 py-2 font-medium">Group</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.ledgerId} className="hover:bg-accent-tint">
                  <td className="px-4 py-2.5 text-muted">{r.code}</td>
                  <td className="px-4 py-2.5 font-medium">{r.name}</td>
                  <td className="px-4 py-2.5 text-muted">{r.groupName}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {r.balance} {r.balanceType}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border text-sm font-semibold">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right">Total (Dr − Cr)</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {(totalDr - totalCr).toFixed(2)} {totalDr >= totalCr ? "DR" : "CR"}
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </>
  );
}
