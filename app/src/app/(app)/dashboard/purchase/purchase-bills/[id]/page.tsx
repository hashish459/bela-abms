import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getPurchaseDoc } from "@/server/purchase/service";
import { getCompanyInfo } from "@/server/settings/service";
import { PurchaseInvoiceDetailView } from "./purchase-invoice-detail-view";

export const metadata = { title: "Purchase Invoice — Bela ABMS" };

export default async function PurchaseInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const s = (await getSession())!;
  if (!can(s.permissions, "purchase.purchase_invoice", "read")) redirect("/dashboard");

  const { id } = await params;
  const [doc, company] = await Promise.all([
    getPurchaseDoc(s.companyId!, id).catch(() => null),
    getCompanyInfo(s.companyId!),
  ]);
  if (!doc) notFound();

  return (
    <PurchaseInvoiceDetailView
      doc={{
        number: doc.number,
        date: doc.date.toISOString().slice(0, 10),
        type: doc.type,
        supplierName: doc.supplierName,
        supplierPan: doc.supplierPan,
        supplierInvoiceNumber: doc.supplierInvoiceNumber,
        referenceNo: doc.referenceNo,
        paymentMode: doc.paymentMode,
        notes: doc.notes,
        status: doc.status,
        subtotal: doc.subtotal.toFixed(2),
        lineDiscountTotal: doc.lineDiscountTotal.toFixed(2),
        invoiceDiscount: doc.invoiceDiscount.toFixed(2),
        totalExciseDuty: doc.totalExciseDuty.toFixed(2),
        totalCustomDuty: doc.totalCustomDuty.toFixed(2),
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
          landedAmount: it.landedAmount.toFixed(2),
          lineVat: it.lineVat.toFixed(2),
        })),
      }}
      company={company}
    />
  );
}
