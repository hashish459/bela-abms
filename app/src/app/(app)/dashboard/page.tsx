import Link from "next/link";
import { TrendingUp, TrendingDown, Wallet, Landmark, AlertTriangle, ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { activeFiscalYear } from "@/lib/fiscal-year";
import { Card } from "@/components/ui";
import { BarChart } from "@/components/bar-chart";
import { adToBs } from "@/lib/bs-date";
import {
  salesSummary, purchaseSummary, cashAndBankBalance, salesTrend, lowStockAlerts,
} from "@/server/dashboard/service";
import { profitAndLoss, receivablesAging, payablesAging } from "@/server/reports/service";
import { listSalesDocs } from "@/server/sales/service";
import { listPurchaseDocs } from "@/server/purchase/service";

export const metadata = { title: "Dashboard — Bela ABMS" };

function Kpi({
  label, value, sub, icon, tone = "default",
}: {
  label: string; value: string; sub?: string; icon: React.ReactNode; tone?: "default" | "danger" | "success";
}) {
  const toneClass = tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span className="text-muted">{icon}</span>
      </div>
      <p className={`mt-2 text-xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  );
}

export default async function DashboardPage() {
  const session = (await getSession())!;
  const companyId = session.companyId!;
  const perms = session.permissions;

  const canSales = can(perms, "sales.sales_invoice", "read");
  const canPurchase = can(perms, "purchase.purchase_invoice", "read");
  const canGl = can(perms, "reports.accounting_reports", "read");
  const canReceivable = can(perms, "reports.receivable_reports", "read");
  const canPayable = can(perms, "reports.payable_reports", "read");
  const canInventory = can(perms, "inventory.product_item", "read") || can(perms, "reports.inventory_reports", "read");

  const fy = await activeFiscalYear(companyId).catch(() => null);

  if (!fy) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Welcome back, {session.firstName}</h1>
        <Card className="p-6 text-sm text-muted">
          No active fiscal year is set. Ask an Administrator to activate one under{" "}
          <Link href="/dashboard/settings/fiscal-year" className="text-accent hover:underline">
            Settings › Fiscal Year
          </Link>{" "}
          before business data can be recorded or reported.
        </Card>
      </div>
    );
  }

  const [
    sales, purchase, cashBank, trend, lowStock, pl, receivable, payable, recentSales, recentPurchases,
  ] = await Promise.all([
    canSales ? salesSummary(companyId, fy.id) : null,
    canPurchase ? purchaseSummary(companyId, fy.id) : null,
    canGl ? cashAndBankBalance(companyId, fy.id) : null,
    canSales ? salesTrend(companyId, fy.id, 30) : null,
    canInventory ? lowStockAlerts(companyId) : null,
    canGl ? profitAndLoss(companyId, fy.id, {}) : null,
    canReceivable ? receivablesAging(companyId) : null,
    canPayable ? payablesAging(companyId) : null,
    canSales ? listSalesDocs(companyId, fy.id, "INVOICE", { page: 1 }) : null,
    canPurchase ? listPurchaseDocs(companyId, fy.id, "INVOICE", { page: 1 }) : null,
  ]);

  const auditCount = await db.auditLog.count({ where: { companyId } });
  const profit = pl ? Number(pl.netProfit) >= 0 : true;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted">Dashboard</p>
          <h1 className="text-xl font-semibold">Welcome back, {session.firstName}</h1>
        </div>
        <p className="text-xs text-muted">
          Fiscal year <strong>{fy.name}</strong> · {new Date().toISOString().slice(0, 10)} (BS {adToBs(new Date().toISOString().slice(0, 10))})
        </p>
      </div>

      {!canSales && !canPurchase && !canGl && !canReceivable && !canPayable && !canInventory && (
        <Card className="p-6 text-sm text-muted">
          Your role doesn&apos;t have read access to any reporting module yet. Ask an
          Administrator to grant permissions under Settings › User &amp; Permissions, or see{" "}
          <Link href="/dashboard/help/roles-permissions" className="text-accent hover:underline">
            Roles &amp; Permissions
          </Link>
          .
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sales && (
          <Kpi
            label={`Net Sales (FY ${fy.name})`}
            value={`Rs. ${sales.netSales}`}
            sub={`${sales.invoiceCount} invoice(s)`}
            icon={<TrendingUp size={16} />}
          />
        )}
        {purchase && (
          <Kpi
            label={`Net Purchases (FY ${fy.name})`}
            value={`Rs. ${purchase.netPurchases}`}
            sub={`${purchase.invoiceCount} invoice(s)`}
            icon={<TrendingDown size={16} />}
          />
        )}
        {pl && (
          <Kpi
            label="Net Profit (FY to date)"
            value={`Rs. ${pl.netProfit}`}
            sub={profit ? "Profit" : "Loss"}
            icon={<Landmark size={16} />}
            tone={profit ? "success" : "danger"}
          />
        )}
        {cashBank !== null && (
          <Kpi label="Cash & Bank Balance" value={`Rs. ${cashBank}`} icon={<Wallet size={16} />} />
        )}
        {receivable && (
          <Kpi
            label="Receivables Outstanding"
            value={`Rs. ${receivable.totals.total}`}
            sub={`${receivable.rows.length} customer(s)`}
            icon={<TrendingUp size={16} />}
          />
        )}
        {payable && (
          <Kpi
            label="Payables Outstanding"
            value={`Rs. ${payable.totals.total}`}
            sub={`${payable.rows.length} supplier(s)`}
            icon={<TrendingDown size={16} />}
          />
        )}
        {lowStock && (
          <Kpi
            label="Low Stock Alerts"
            value={String(lowStock.length)}
            sub={lowStock.length ? "at or below reorder point" : "all healthy"}
            icon={<AlertTriangle size={16} />}
            tone={lowStock.length ? "danger" : "success"}
          />
        )}
        <Kpi label="Audit Log Entries" value={auditCount.toLocaleString("en-US")} icon={<Landmark size={16} />} />
      </div>

      {trend && (
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Sales — last 30 days</h2>
            <Link href="/dashboard/reports/accounting/day-book" className="flex items-center gap-1 text-xs text-accent hover:underline">
              Day Book <ArrowRight size={12} />
            </Link>
          </div>
          <BarChart points={trend} />
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {recentSales && (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2.5">
              <h3 className="text-sm font-semibold">Recent Sales Invoices</h3>
              <Link href="/dashboard/sales/invoice" className="flex items-center gap-1 text-xs text-accent hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {recentSales.rows.length === 0 && (
                  <tr><td className="px-4 py-8 text-center text-muted">No sales invoices yet.</td></tr>
                )}
                {recentSales.rows.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-accent-tint">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{r.number}</p>
                      <p className="text-xs text-muted">{r.customer} · {r.date}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <p className="tabular-nums font-medium">Rs. {r.grandTotal}</p>
                      <p className="text-xs text-muted">{r.status}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {recentPurchases && (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2.5">
              <h3 className="text-sm font-semibold">Recent Purchase Invoices</h3>
              <Link href="/dashboard/purchase/purchase-bills" className="flex items-center gap-1 text-xs text-accent hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {recentPurchases.rows.length === 0 && (
                  <tr><td className="px-4 py-8 text-center text-muted">No purchase invoices yet.</td></tr>
                )}
                {recentPurchases.rows.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-accent-tint">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{r.number}</p>
                      <p className="text-xs text-muted">{r.supplier} · {r.date}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <p className="tabular-nums font-medium">Rs. {r.grandTotal}</p>
                      <p className="text-xs text-muted">{r.status}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {receivable && receivable.rows.length > 0 && (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2.5">
              <h3 className="text-sm font-semibold">Top Outstanding Receivables</h3>
              <Link href="/dashboard/reports/receivable/aging" className="flex items-center gap-1 text-xs text-accent hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {receivable.rows.slice(0, 5).map((r) => (
                  <tr key={r.partyId} className="hover:bg-accent-tint">
                    <td className="px-4 py-2.5">{r.partyName}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                      Rs. {r.total}
                      {Number(r.over90) > 0 && <span className="ml-2 text-xs text-danger">90+ days</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {lowStock && lowStock.length > 0 && (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2.5">
              <h3 className="text-sm font-semibold">Low Stock Alerts</h3>
              <Link href="/dashboard/reports/inventory/stock-summary" className="flex items-center gap-1 text-xs text-accent hover:underline">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                {lowStock.slice(0, 5).map((p) => (
                  <tr key={p.id} className="hover:bg-accent-tint">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted">{p.sku}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-danger">
                      {p.onHand} {p.unit}
                      <span className="ml-1 text-xs text-muted">(reorder {p.reorderPoint})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
