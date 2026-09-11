"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Card, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

type Row = {
  id: string; number: string; date: string; party: string; pan: string; reference: string;
  nonTaxable: string; taxable: string; vat: string; grandTotal: string; outstanding: string; status: string;
};
type Data = { rows: Row[]; totals: { nonTaxable: string; taxable: string; vat: string; grandTotal: string } };

const STATUS_STYLE: Record<string, string> = {
  PAID: "text-success", OPEN: "text-accent", PARTIALLY_PAID: "text-accent",
  RETURNED: "text-muted", CANCELLED: "text-danger line-through",
};

export function DocReportView({
  title,
  crumb,
  apiPath,
  partyLabel,
  detailBase,
}: {
  title: string;
  crumb: string;
  apiPath: string;
  partyLabel: string;
  /** When set, rows link to `${detailBase}/${id}` (only invoices/bills have a detail page today). */
  detailBase?: string;
}) {
  const router = useRouter();
  const nowDate = new Date();
  const monthAgoDate = new Date(nowDate);
  monthAgoDate.setDate(monthAgoDate.getDate() - 30);
  const today = nowDate.toISOString().slice(0, 10);
  const monthAgo = monthAgoDate.toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const sep = apiPath.includes("?") ? "&" : "?";
      api<Data>(`${apiPath}${sep}from=${from}&to=${to}`).then((res) => {
        if (res.ok) setData(res.data);
        setLoading(false);
      });
    }, 0);
    return () => clearTimeout(t);
  }, [apiPath, from, to]);

  return (
    <>
      <PageHeader crumbs={["Reports", crumb, title]} title={title} action={<PrintButton />} />
      <p className="mb-3 text-xs text-muted">
        Includes PAN and VAT columns, so this also serves as the tax-detail view of this report.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3" data-app-chrome>
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>

      {loading || !data ? (
        <Card className="p-10 text-center text-sm text-muted">Loading…</Card>
      ) : data.rows.length === 0 ? (
        <EmptyState title="No documents in this range" hint="Try a wider date range." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">No.</th>
                <th className="px-4 py-2 font-medium">{partyLabel}</th>
                <th className="px-4 py-2 font-medium">PAN</th>
                <th className="px-4 py-2 text-right font-medium">Taxable</th>
                <th className="px-4 py-2 text-right font-medium">VAT</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 text-right font-medium">Outstanding</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.rows.map((d) => (
                <tr
                  key={d.id}
                  onClick={detailBase ? () => router.push(`${detailBase}/${d.id}`) : undefined}
                  className={detailBase ? "cursor-pointer hover:bg-accent-tint" : "hover:bg-accent-tint"}
                >
                  <td className="px-4 py-2.5">{d.date}</td>
                  <td className="px-4 py-2.5 font-medium">{d.number}</td>
                  <td className="px-4 py-2.5">{d.party}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{d.pan}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{d.taxable}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{d.vat}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{d.grandTotal}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{d.outstanding}</td>
                  <td className={`px-4 py-2.5 text-xs font-medium ${STATUS_STYLE[d.status] ?? ""}`}>
                    {d.status.replace("_", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-background font-semibold">
              <tr>
                <td colSpan={4} className="px-4 py-2.5 text-right">Total</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.taxable}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.vat}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{data.totals.grandTotal}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </>
  );
}
