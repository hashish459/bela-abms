"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { api, Button, Card, PageHeader, toast } from "@/components/ui";

type QueryResult = { columns: string[]; rows: Record<string, unknown>[]; rowCount: number; elapsedMs: number };

const EXAMPLES: { label: string; sql: string }[] = [
  { label: "Chart of accounts", sql: "SELECT code, name, \"accountGroupId\" FROM \"Ledger\" WHERE \"deletedAt\" IS NULL ORDER BY code LIMIT 50" },
  { label: "Recent vouchers", sql: "SELECT number, type, date, narration FROM \"Voucher\" ORDER BY date DESC, number DESC LIMIT 20" },
  { label: "Low / out of stock products", sql: "SELECT name, sku, \"reorderPoint\" FROM \"Product\" WHERE \"deletedAt\" IS NULL AND kind = 'GOODS' ORDER BY name LIMIT 50" },
  { label: "Outstanding sales invoices", sql: "SELECT number, \"customerName\", \"grandTotal\", \"amountPaid\", status FROM \"SalesDoc\" WHERE type = 'INVOICE' AND status NOT IN ('PAID','CANCELLED') ORDER BY date DESC" },
  { label: "Recent audit log", sql: "SELECT action, entity, \"createdAt\" FROM \"AuditLog\" ORDER BY \"createdAt\" DESC LIMIT 30" },
];

export function DatabaseConsoleView() {
  const [sql, setSql] = useState(EXAMPLES[0].sql);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    const res = await api<QueryResult>("/api/system/query", { method: "POST", body: JSON.stringify({ sql }) });
    setRunning(false);
    if (!res.ok) {
      setError(res.error.message);
      setResult(null);
      return;
    }
    setResult(res.data);
    toast(`${res.data.rowCount} row(s) in ${res.data.elapsedMs} ms`);
  }

  return (
    <>
      <PageHeader crumbs={["System", "Database Console"]} title="Database Console" />
      <p className="mb-4 text-sm text-muted">
        Read-only diagnostic SQL. <strong>SELECT / WITH only</strong> — writes, DDL, and
        multiple statements are rejected before they reach the database, results are capped
        at 200 rows, and every query is written to the audit log.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            onClick={() => setSql(ex.sql)}
            className="rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:bg-accent-tint"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <Card className="mb-4 p-3">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={5}
          spellCheck={false}
          className="w-full rounded-lg bg-background p-3 font-mono text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-accent"
        />
        <div className="mt-3 flex justify-end">
          <Button onClick={run} loading={running}>
            <Play size={14} /> Run query
          </Button>
        </div>
      </Card>

      {running && (
        <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted">
          <Loader2 size={16} className="animate-spin" /> Running…
        </Card>
      )}

      {error && !running && (
        <Card className="border-danger/30 bg-danger/5 p-4 text-sm text-danger">{error}</Card>
      )}

      {result && !running && !error && (
        <>
          <p className="mb-2 text-xs text-muted">
            {result.rowCount} row(s) · {result.elapsedMs} ms
          </p>
          <Card className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background text-left text-xs text-muted">
                <tr>
                  {result.columns.map((c) => (
                    <th key={c} className="whitespace-nowrap px-3 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.rows.length === 0 && (
                  <tr>
                    <td colSpan={result.columns.length || 1} className="px-3 py-8 text-center text-muted">
                      No rows returned.
                    </td>
                  </tr>
                )}
                {result.rows.map((r, i) => (
                  <tr key={i} className="hover:bg-accent-tint">
                    {result.columns.map((c) => (
                      <td key={c} className="whitespace-nowrap px-3 py-2 tabular-nums">
                        {r[c] === null ? <span className="text-muted">null</span> : String(r[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
