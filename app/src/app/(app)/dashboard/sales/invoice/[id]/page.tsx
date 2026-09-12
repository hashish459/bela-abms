import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getSalesDoc } from "@/server/sales/service";
import { getBillFooterForPrint, getCompanyInfo, getInvoiceSetting, listCustomStatuses } from "@/server/settings/service";
import { InvoiceDetailView } from "./invoice-detail-view";

export const metadata = { title: "Sales Invoice — Bela ABMS" };

export default async function SalesInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const s = (await getSession())!;
  if (!can(s.permissions, "sales.sales_invoice", "read")) redirect("/dashboard");

  const { id } = await params;
  const [doc, company, invoiceSetting, billFooter, customStatuses] = await Promise.all([
    getSalesDoc(s.companyId!, id).catch(() => null),
    getCompanyInfo(s.companyId!),
    getInvoiceSetting(s.companyId!),
    getBillFooterForPrint(s.companyId!),
    listCustomStatuses(s.companyId!),
  ]);
  if (!doc) notFound();

  return (
    <InvoiceDetailView
      doc={{
        id: doc.id,
        number: doc.number,
        date: doc.date.toISOString().slice(0, 10),
        type: doc.type,
        customerName: doc.customerName,
        customerPan: doc.customerPan,
        referenceNo: doc.referenceNo,
        paymentMode: doc.paymentMode,
        notes: doc.notes,
        status: doc.status,
        subtotal: doc.subtotal.toFixed(2),
        lineDiscountTotal: doc.lineDiscountTotal.toFixed(2),
        invoiceDiscount: doc.invoiceDiscount.toFixed(2),
        nonTaxableTotal: doc.nonTaxableTotal.toFixed(2),
        taxableTotal: doc.taxableTotal.toFixed(2),
        vatAmount: doc.vatAmount.toFixed(2),
        grandTotal: doc.grandTotal.toFixed(2),
        amountPaid: doc.amountPaid.toFixed(2),
        fiscalYearName: doc.fiscalYear.name,
        items: doc.items.map((it) => ({
          id: it.id,
          description: it.description,
          hsCode: it.hsCode,
          qty: it.qty.toFixed(3),
          rate: it.rate.toFixed(2),
          discount: it.discount.toFixed(2),
          taxRatePct: it.taxRatePct.toFixed(2),
          netAmount: it.netAmount.toFixed(2),
          lineVat: it.lineVat.toFixed(2),
        })),
        customFieldValues: doc.customFieldValues,
      }}
      company={company}
      invoiceSetting={invoiceSetting}
      billFooter={billFooter}
      customStatus={doc.customStatus}
      availableStatuses={customStatuses
        .filter((c) => c.module === "SALES_INVOICE" && c.isActive)
        .map((c) => ({ id: c.id, label: c.label, color: c.color }))}
      canTag={can(s.permissions, "sales.sales_invoice", "update")}
    />
  );
}
