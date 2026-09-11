"use client";

import { useEffect, useState } from "react";
import { api, Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";

type Row = { id: string; at: string; user: string; email: string; action: string; entity: string; entityId: string; ip: string };
type Data = { rows: Row[]; total: number; page: number; pageSize: number };

const ACTION_STYLE: Record<string, string> = {
  LOGIN: "text-success", LOGOUT: "text-muted", CREATE: "text-accent", UPDATE: "text-accent", DELETE: "text-danger",
};

export function ActivityLogView() {
  const nowDate = new Date();
  const weekAgoDate = new Date(nowDate);
  weekAgoDate.setDate(weekAgoDate.getDate() - 7);
  const today = nowDate.toISOString().slice(0, 10);
  const weekAgo = weekAgoDate.toISOString().slice(0, 10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api<Data>(`/api/reports/activity-log?from=${from}&to=${to}&page=${page}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [from, to, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader crumbs={["Reports", "System", "Activity Log"]} title="Activity Log" />
      <p className="mb-3 text-xs text-muted">Login, create, update and delete actions across every module.</p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </Field>
      </div>

      {loading || !data ? (
        <Card className="p-10 text-center text-sm text-muted">Loading…</Card>
      ) : data.rows.length === 0 ? (
        <EmptyState title="No activity" hint="Try a wider date range." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-background text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">User</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                  <th className="px-4 py-2 font-medium">Entity</th>
                  <th className="px-4 py-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-accent-tint">
                    <td className="px-4 py-2.5 tabular-nums">{new Date(r.at).toLocaleString()}</td>
                    <td className="px-4 py-2.5">{r.user} <span className="text-xs text-muted">{r.email}</span></td>
                    <td className={`px-4 py-2.5 text-xs font-medium ${ACTION_STYLE[r.action] ?? ""}`}>{r.action}</td>
                    <td className="px-4 py-2.5 text-muted">{r.entity}{r.entityId ? ` #${r.entityId.slice(-6)}` : ""}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">{r.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {pages > 1 && (
            <div className="mt-3 flex items-center justify-between text-sm text-muted">
              <span>Page {data.page} of {pages} · {data.total} entries</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg px-3 py-1.5 ring-1 ring-border disabled:opacity-40">Prev</button>
                <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg px-3 py-1.5 ring-1 ring-border disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
