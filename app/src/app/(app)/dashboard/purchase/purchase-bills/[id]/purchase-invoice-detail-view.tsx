"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { StatusTagPicker, type StatusTag, type StatusTagOption } from "@/components/status-tag-picker";
import { CustomFieldsDisplay } from "@/components/custom-fields-fields";
import { InvoiceTemplateRenderer, type InvoiceTemplateData } from "@/components/invoice-templates";
import { adToBs } from "@/lib/bs-date";

type Item = {
  id: string; description: string; hsCode: string | null;
  qty: string; rate: string; discount: string; taxRatePct: string;
  landedAmount: string; lineVat: string;
};
type CustomFieldValue = { id: string; label: string; fieldType: string; value: string | null };
type Doc = {
  id: string; number: string; date: string; type: string;
  supplierName: string | null; supplierPan: string | null; supplierInvoiceNumber: string | null;
  referenceNo: string | null; paymentMode: string; notes: string | null; status: string;
  subtotal: string; lineDiscountTotal: string; invoiceDiscount: string;
  totalExciseDuty: string; totalCustomDuty: string;
  nonTaxableTotal: string; taxableTotal: string; vatAmount: string;
  grandTotal: string; amountPaid: string; fiscalYearName: string;
  items: Item[];
  customFieldValues: CustomFieldValue[];
};
type Company = InvoiceTemplateData["company"];
type InvoiceSetting = { showHsCode: boolean; showDiscountColumn: boolean; template: string };
type BillFooter = { termsAndConditions: string | null; authorizedSignatory: string | null; footerNote: string | null } | null;

const DOC_LABEL: Record<string, string> = {
  INVOICE: "Purchase Invoice", PURCHASE_ORDER: "Purchase Order", DEBIT_NOTE: "Debit Note",
};

export function PurchaseInvoiceDetailView({
  doc, company, invoiceSetting, billFooter, customStatus, availableStatuses, canTag,
}: {
  doc: Doc; company: Company; invoiceSetting: InvoiceSetting; billFooter: BillFooter;
  customStatus: StatusTag; availableStatuses: StatusTagOption[]; canTag: boolean;
}) {
  // Purchase invoices intentionally never print the company's own bank
  // details or payment QR (a payable, not a receivable) even though
  // InvoiceSetting is shared with Sales Invoice — see Docs/DATABASE.md.
  const templateData: InvoiceTemplateData = {
    documentLabel: DOC_LABEL[doc.type] ?? doc.type,
    number: doc.number,
    date: `${doc.date} (BS ${adToBs(doc.date)})`,
    fiscalYearName: doc.fiscalYearName,
    partyLabel: "Supplier",
    partyName: doc.supplierName ?? "—",
    partyPan: doc.supplierPan,
    referenceNo: doc.referenceNo,
    paymentMode: doc.paymentMode,
    status: doc.status,
    amountColumnLabel: "Landed Amount",
    items: doc.items.map((it) => ({
      id: it.id, description: it.description, hsCode: it.hsCode,
      qty: it.qty, rate: it.rate, discount: it.discount, taxRatePct: it.taxRatePct,
      amount: it.landedAmount,
    })),
    subtotal: doc.subtotal,
    lineDiscountTotal: doc.lineDiscountTotal,
    invoiceDiscount: doc.invoiceDiscount,
    totalExciseDuty: doc.totalExciseDuty,
    totalCustomDuty: doc.totalCustomDuty,
    nonTaxableTotal: doc.nonTaxableTotal,
    taxableTotal: doc.taxableTotal,
    vatAmount: doc.vatAmount,
    grandTotal: doc.grandTotal,
    amountPaid: doc.amountPaid,
    notes: doc.notes,
    company,
    billFooter: billFooter ? { ...billFooter, bankAccount: null } : null,
    invoiceSetting: { showHsCode: invoiceSetting.showHsCode, showDiscountColumn: invoiceSetting.showDiscountColumn, showBankDetails: false, showQrCode: false },
  };

  return (
    <>
      <PageHeader
        crumbs={["Purchase", "Purchase Invoice", doc.number]}
        title={doc.number}
        action={
          <div className="flex items-center gap-2" data-app-chrome>
            <StatusTagPicker
              apiPath={`/api/purchase/invoices/${doc.id}`}
              current={customStatus}
              options={availableStatuses}
              canEdit={canTag}
            />
            <Link href="/dashboard/purchase/purchase-bills">
              <Button variant="outline">
                <ArrowLeft size={14} /> Back
              </Button>
            </Link>
            <PrintButton />
          </div>
        }
      />

      <Card className="p-6 print:border-0 print:p-0 print:shadow-none">
        <InvoiceTemplateRenderer template={invoiceSetting.template} data={templateData} />
        <div className="mt-4">
          <CustomFieldsDisplay values={doc.customFieldValues} />
        </div>
      </Card>
    </>
  );
}
