import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { expiryManagement } from "@/server/inventory/stock";
import { Card, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Expiry Management — Bela ABMS" };

export default async function ExpiryManagementPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "reports.inventory_reports", "read")) redirect("/dashboard");
  const rows = await expiryManagement(s.companyId!);

  return (
    <>
      <PageHeader crumbs={["Reports", "Inventory", "Expiry Management"]} title="Expiry Management" action={<PrintButton />} />
      <p className="mb-3 text-sm text-muted">
        Batches with stock on hand that are already expired or expiring within 90 days,
        soonest first.
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
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  Nothing expired or near expiry.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.batchId} className={r.status === "EXPIRED" ? "bg-danger/5" : "hover:bg-accent-tint"}>
                <td className="px-4 py-2.5">
                  {r.productName} <span className="text-xs text-muted">{r.sku}</span>
                </td>
                <td className="px-4 py-2.5 font-medium">{r.batchNo}</td>
                <td className="px-4 py-2.5 text-muted">{r.warehouse}</td>
                <td className="px-4 py-2.5 text-muted">{r.expiryDate}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.onHand} {r.unit}</td>
                <td className="px-4 py-2.5">
                  {r.status === "EXPIRED" ? (
                    <span className="text-xs font-medium text-danger">Expired {Math.abs(r.daysToExpiry)}d ago</span>
                  ) : (
                    <span className="text-xs font-medium text-accent">{r.daysToExpiry}d left</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
