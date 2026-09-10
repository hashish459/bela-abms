import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { stockSummary } from "@/server/inventory/stock";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Stock Summary — Bela ABMS" };

export default async function StockSummaryPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.inventory_reports", "read")) redirect("/dashboard");
  const rows = await stockSummary(s.companyId!);

  return (
    <>
      <PageHeader crumbs={["Reports", "Inventory", "Stock Summary"]} title="Stock Summary" />
      <p className="mb-3 text-sm text-muted">
        On-hand quantity per product, derived from all stock movements.
      </p>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Code / SKU</th>
              <th className="px-4 py-2 font-medium">Product</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 text-right font-medium">On hand</th>
              <th className="px-4 py-2 text-right font-medium">Re-order pt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No goods products yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className={r.belowReorder ? "bg-danger/5" : "hover:bg-accent-tint"}>
                <td className="px-4 py-2.5 font-medium">{r.sku}</td>
                <td className="px-4 py-2.5">{r.name}</td>
                <td className="px-4 py-2.5 text-muted">{r.category || "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {r.onHand} {r.unit}
                  {r.belowReorder && (
                    <span className="ml-2 rounded bg-danger/10 px-1.5 py-0.5 text-xs text-danger">
                      low
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                  {r.reorderPoint ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
