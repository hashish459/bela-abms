import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { batchWiseStockSummary } from "@/server/inventory/stock";
import { Card, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Batch Wise Stock Summary — Bela ABMS" };

export default async function BatchWiseStockSummaryPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.inventory_reports", "read")) redirect("/dashboard");
  const rows = await batchWiseStockSummary(s.companyId!);

  return (
    <>
      <PageHeader crumbs={["Reports", "Inventory", "Batch Wise Stock Summary"]} title="Batch Wise Stock Summary" action={<PrintButton />} />
      <p className="mb-3 text-sm text-muted">
        On-hand quantity per batch/lot — populated when a Purchase Invoice line records a
        batch number. Products purchased without a batch number never appear here (see
        Stock Summary for the product-level total).
      </p>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">Batch No.</th>
              <th className="px-4 py-2 font-medium">Warehouse</th>
              <th className="px-4 py-2 font-medium">Expiry</th>
              <th className="px-4 py-2 text-right font-medium">On hand</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No batches recorded yet — enter a batch number on a Purchase Invoice line to start tracking one.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.batchId} className="hover:bg-accent-tint">
                <td className="px-4 py-2.5">
                  {r.productName} <span className="text-xs text-muted">{r.sku}</span>
                </td>
                <td className="px-4 py-2.5 font-medium">{r.batchNo}</td>
                <td className="px-4 py-2.5 text-muted">{r.warehouse}</td>
                <td className="px-4 py-2.5 text-muted">{r.expiryDate ?? "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.onHand} {r.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
