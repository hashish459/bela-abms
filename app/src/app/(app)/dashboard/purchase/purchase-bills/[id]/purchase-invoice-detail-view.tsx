"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { PrintLetterhead } from "@/components/print-letterhead";
import { PrintBillFooter } from "@/components/print-bill-footer";
import { StatusTagPicker, type StatusTag, type StatusTagOption } from "@/components/status-tag-picker";
import { CustomFieldsDisplay } from "@/components/custom-fields-fields";
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
type Company = {
  legalName: string; displayName: string | null;
  registeredAddress: string; registeredAddress2: string | null;
  phone: string; phone2: string | null; email: string; panNumber: string;
} | null;
type InvoiceSetting = { showHsCode: boolean; showDiscountColumn: boolean };
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
        <PrintLetterhead
          company={company}
          documentTitle={DOC_LABEL[doc.type] ?? doc.type}
          documentNumber={doc.number}
          documentDate={`${doc.date} (BS ${adToBs(doc.date)})`}
          meta={[{ label: "Fiscal Year", value: doc.fiscalYearName }]}
        />

        <div className="mb-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Supplier</div>
            <div className="mt-1 font-medium">{doc.supplierName ?? "—"}</div>
            {doc.supplierPan && <div className="text-xs text-muted">PAN: {doc.supplierPan}</div>}
          </div>
          <div className="sm:text-right">
            <div className="text-xs text-muted">
              Supplier bill no: <span className="text-foreground">{doc.supplierInvoiceNumber ?? "—"}</span>
            </div>
            <div className="text-xs text-muted">
              Reference: <span className="text-foreground">{doc.referenceNo ?? "—"}</span>
            </div>
            <div className="text-xs text-muted">
              Payment mode: <span className="text-foreground">{doc.paymentMode.replace("_", " ")}</span>
            </div>
            <div className="text-xs text-muted">
              Status: <span className="text-foreground">{doc.status.replace("_", " ")}</span>
            </div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted">
            <tr>
              <th className="py-2 font-medium">Description</th>
              {invoiceSetting.showHsCode && <th className="py-2 font-medium">HS Code</th>}
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Rate</th>
              {invoiceSetting.showDiscountColumn && <th className="py-2 text-right font-medium">Discount</th>}
              <th className="py-2 text-right font-medium">VAT %</th>
              <th className="py-2 text-right font-medium">Landed Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {doc.items.map((it) => (
              <tr key={it.id}>
                <td className="py-2">{it.description}</td>
                {invoiceSetting.showHsCode && <td className="py-2 text-xs text-muted">{it.hsCode ?? "—"}</td>}
                <td className="py-2 text-right tabular-nums">{it.qty}</td>
                <td className="py-2 text-right tabular-nums">{it.rate}</td>
                {invoiceSetting.showDiscountColumn && <td className="py-2 text-right tabular-nums">{it.discount}</td>}
                <td className="py-2 text-right tabular-nums">{it.taxRatePct}</td>
                <td className="py-2 text-right tabular-nums font-medium">{it.landedAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <table className="w-full max-w-xs text-sm">
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-1 text-muted">Subtotal</td>
                <td className="py-1 text-right tabular-nums">{doc.subtotal}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">Line discount</td>
                <td className="py-1 text-right tabular-nums">{doc.lineDiscountTotal}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">Invoice discount</td>
                <td className="py-1 text-right tabular-nums">{doc.invoiceDiscount}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">Excise duty</td>
                <td className="py-1 text-right tabular-nums">{doc.totalExciseDuty}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">Custom duty</td>
                <td className="py-1 text-right tabular-nums">{doc.totalCustomDuty}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">Non-taxable</td>
                <td className="py-1 text-right tabular-nums">{doc.nonTaxableTotal}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">Taxable</td>
                <td className="py-1 text-right tabular-nums">{doc.taxableTotal}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">VAT</td>
                <td className="py-1 text-right tabular-nums">{doc.vatAmount}</td>
              </tr>
              <tr className="border-t-2 border-border font-semibold">
                <td className="py-1.5">Grand Total</td>
                <td className="py-1.5 text-right tabular-nums">Rs. {doc.grandTotal}</td>
              </tr>
              <tr>
                <td className="py-1 text-muted">Amount paid</td>
                <td className="py-1 text-right tabular-nums">{doc.amountPaid}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {doc.notes && <p className="mt-4 text-xs text-muted">{doc.notes}</p>}

        <div className="mt-4">
          <CustomFieldsDisplay values={doc.customFieldValues} />
        </div>

        <PrintBillFooter
          terms={billFooter?.termsAndConditions ?? null}
          authorizedSignatory={billFooter?.authorizedSignatory ?? null}
          footerNote={billFooter?.footerNote ?? null}
          bankAccount={null}
          showBankDetails={false}
          qrUrl={null}
          showQrCode={false}
        />
      </Card>
    </>
  );
}
