import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { ReportsCatalogue, type ReportGroup } from "@/components/reports-catalogue";

export const metadata = { title: "Reports — Bela ABMS" };

export default async function ReportsPage() {
  const s = (await getSession())!;

  const allGroups: (ReportGroup & { perm: string })[] = [
    {
      key: "accounting",
      name: "Accounting",
      perm: "reports.accounting_reports",
      reports: [
        { title: "Transaction List", href: "/dashboard/reports/accounting/transaction-list" },
        { title: "General Ledger Summary", href: "/dashboard/reports/accounting/general-ledger-summary" },
        { title: "Trial Balance", href: "/dashboard/reports/accounting/trial-balance" },
        { title: "Contra Report", href: "/dashboard/reports/accounting/contra-report" },
        { title: "Statement of Profit & Loss", href: "/dashboard/reports/accounting/profit-loss" },
        { title: "Day Book", href: "/dashboard/reports/accounting/day-book" },
        { title: "Ledger Report", href: "/dashboard/reports/accounting/ledger" },
        { title: "Journal Report", href: "/dashboard/reports/accounting/journal-report" },
        { title: "Statement of Financial Position", href: "/dashboard/reports/accounting/balance-sheet" },
        {
          title: "Statement of Other Comprehensive Income",
          href: null,
          gapReason: "Not applicable — no revaluation/OCI items exist to report until an asset revaluation or FX-translation feature is added",
        },
      ],
    },
    {
      key: "sales",
      name: "Sales",
      perm: "reports.sales_reports",
      reports: [
        { title: "Sales Report", href: "/dashboard/reports/sales/sales-report" },
        { title: "Sales Profit Report", href: "/dashboard/reports/sales/sales-profit-report" },
        { title: "Sales Return Report", href: "/dashboard/reports/sales/sales-return-report" },
        { title: "Receipt Report", href: "/dashboard/reports/sales/receipt-report" },
        { title: "Sales Report (Tax)", href: "/dashboard/reports/sales/sales-report" },
        { title: "Sales Return Report (Tax)", href: "/dashboard/reports/sales/sales-return-report" },
      ],
    },
    {
      key: "purchase",
      name: "Purchase",
      perm: "reports.purchase_reports",
      reports: [
        { title: "Purchase Report", href: "/dashboard/reports/purchase/purchase-report" },
        { title: "Purchase Return Report", href: "/dashboard/reports/purchase/purchase-return-report" },
        { title: "Payment Report", href: "/dashboard/reports/purchase/payment-report" },
        { title: "Purchase Report (Tax)", href: "/dashboard/reports/purchase/purchase-report" },
        { title: "Purchase Return Report (Tax)", href: "/dashboard/reports/purchase/purchase-return-report" },
      ],
    },
    {
      key: "receivable",
      name: "Receivable",
      perm: "reports.receivable_reports",
      reports: [
        { title: "Receivable Aging", href: "/dashboard/reports/receivable/aging" },
        { title: "Customer Aging Report", href: "/dashboard/reports/receivable/aging" },
      ],
    },
    {
      key: "payable",
      name: "Payable",
      perm: "reports.payable_reports",
      reports: [{ title: "Payable Aging", href: "/dashboard/reports/payable/aging" }],
    },
    {
      key: "inventory",
      name: "Inventory",
      perm: "reports.inventory_reports",
      reports: [
        { title: "Stock Summary", href: "/dashboard/reports/inventory/stock-summary" },
        { title: "Batch Wise Stock Summary", href: "/dashboard/reports/inventory/batch-wise-stock-summary" },
        { title: "Expiry Management", href: "/dashboard/reports/inventory/expiry-management" },
      ],
    },
    {
      key: "system",
      name: "System",
      perm: "reports.system_reports",
      reports: [{ title: "Activity Log", href: "/dashboard/reports/system/activity-log" }],
    },
    {
      key: "tax",
      name: "Tax",
      perm: "reports.tax_reports",
      reports: [
        { title: "VAT Return", href: "/dashboard/reports/tax/vat-return" },
        { title: "Monthly Tax Summary", href: "/dashboard/reports/tax/monthly-tax-summary" },
        { title: "Annex 13 Report", href: null, gapReason: "Statutory IRD format — needs the official column spec before it can be built correctly" },
        { title: "Annex 5 Materialised View Report", href: null, gapReason: "Statutory IRD format — needs the official column spec before it can be built correctly" },
      ],
    },
    {
      key: "budget",
      name: "Budget",
      perm: "reports.budget_reports",
      reports: [{ title: "Budget vs Expense Report", href: "/dashboard/reports/budget/budget-vs-expense" }],
    },
  ];

  const groups = allGroups
    .filter((g) => can(s.permissions, g.perm, "read"))
    .map((g) => ({ key: g.key, name: g.name, reports: g.reports }));
  if (groups.length === 0) redirect("/dashboard");

  return <ReportsCatalogue groups={groups} />;
}
