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
  netAmount: string; lineVat: string;
};
type CustomFieldValue = { id: string; label: string; fieldType: string; value: string | null };
type Doc = {
  id: string; number: string; date: string; type: string;
  customerName: string | null; customerPan: string | null;
  referenceNo: string | null; paymentMode: string; notes: string | null; status: string;
  subtotal: string; lineDiscountTotal: string; invoiceDiscount: string;
  nonTaxableTotal: string; taxableTotal: string; vatAmount: string;
  grandTotal: string; amountPaid: string; fiscalYearName: string;
  items: Item[];
  customFieldValues: CustomFieldValue[];
};
type Company = InvoiceTemplateData["company"];
type InvoiceSetting = InvoiceTemplateData["invoiceSetting"] & { template: string };
type BillFooter = InvoiceTemplateData["billFooter"];

const DOC_LABEL: Record<string, string> = {
  INVOICE: "Tax Invoice", QUOTATION: "Quotation", SALES_ORDER: "Sales Order",
  PROFORMA_INVOICE: "Proforma Invoice", CREDIT_NOTE: "Credit Note",
};

export function InvoiceDetailView({
  doc, company, invoiceSetting, billFooter, customStatus, availableStatuses, canTag,
}: {
  doc: Doc; company: Company; invoiceSetting: InvoiceSetting; billFooter: BillFooter;
  customStatus: StatusTag; availableStatuses: StatusTagOption[]; canTag: boolean;
}) {
  const templateData: InvoiceTemplateData = {
    documentLabel: DOC_LABEL[doc.type] ?? doc.type,
    number: doc.number,
    date: `${doc.date} (BS ${adToBs(doc.date)})`,
    fiscalYearName: doc.fiscalYearName,
    partyLabel: "Bill To",
    partyName: doc.customerName ?? "Cash / walk-in",
    partyPan: doc.customerPan,
    referenceNo: doc.referenceNo,
    paymentMode: doc.paymentMode,
    status: doc.status,
    amountColumnLabel: "Amount",
    items: doc.items.map((it) => ({
      id: it.id, description: it.description, hsCode: it.hsCode,
      qty: it.qty, rate: it.rate, discount: it.discount, taxRatePct: it.taxRatePct,
      amount: it.netAmount,
    })),
    subtotal: doc.subtotal,
    lineDiscountTotal: doc.lineDiscountTotal,
    invoiceDiscount: doc.invoiceDiscount,
    nonTaxableTotal: doc.nonTaxableTotal,
    taxableTotal: doc.taxableTotal,
    vatAmount: doc.vatAmount,
    grandTotal: doc.grandTotal,
    amountPaid: doc.amountPaid,
    notes: doc.notes,
    company,
    billFooter,
    invoiceSetting,
  };

  return (
    <>
      <PageHeader
        crumbs={["Sales", "Sales Invoice", doc.number]}
        title={doc.number}
        action={
          <div className="flex items-center gap-2" data-app-chrome>
            <StatusTagPicker
              apiPath={`/api/sales/invoices/${doc.id}`}
              current={customStatus}
              options={availableStatuses}
              canEdit={canTag}
            />
            <Link href="/dashboard/sales/invoice">
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
