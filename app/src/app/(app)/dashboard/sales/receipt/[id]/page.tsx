import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getReceipt } from "@/server/sales/service";
import { getCompanyInfo, getBillFooterForPrint, getInvoiceSetting } from "@/server/settings/service";
import { adToBs } from "@/lib/bs-date";
import { ReceiptDetailView } from "./receipt-detail-view";

export const metadata = { title: "Receipt — Bela ABMS" };

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const s = (await getSession())!;
  if (!can(s.permissions, "sales.receipt", "read")) redirect("/dashboard");

  const { id } = await params;
  const [receipt, company, billFooter, invoiceSetting] = await Promise.all([
    getReceipt(s.companyId!, id).catch(() => null),
    getCompanyInfo(s.companyId!),
    getBillFooterForPrint(s.companyId!),
    getInvoiceSetting(s.companyId!),
  ]);
  if (!receipt) notFound();

  const dateStr = receipt.date.toISOString().slice(0, 10);

  return (
    <ReceiptDetailView
      template={invoiceSetting.receiptTemplate}
      data={{
        number: receipt.number,
        date: `${dateStr} (BS ${adToBs(dateStr)})`,
        fiscalYearName: receipt.fiscalYear.name,
        customerName: receipt.customer?.name ?? "—",
        customerPan: receipt.customer?.panNumber ?? null,
        amount: receipt.amount.toFixed(2),
        paymentMode: receipt.paymentMode,
        paymentLedgerName: receipt.paymentLedger?.name ?? "—",
        againstNumber: receipt.againstDoc?.number ?? null,
        reference: receipt.reference,
        notes: receipt.notes,
        company,
        authorizedSignatory: billFooter?.authorizedSignatory ?? null,
      }}
    />
  );
}
