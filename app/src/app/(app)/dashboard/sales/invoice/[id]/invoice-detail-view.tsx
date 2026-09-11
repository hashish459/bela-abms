"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { PrintLetterhead } from "@/components/print-letterhead";
import { adToBs } from "@/lib/bs-date";

type Item = {
  id: string; description: string; hsCode: string | null;
  qty: string; rate: string; discount: string; taxRatePct: string;
  netAmount: string; lineVat: string;
};
type Doc = {
  number: string; date: string; type: string;
  customerName: string | null; customerPan: string | null;
  referenceNo: string | null; paymentMode: string; notes: string | null; status: string;
  subtotal: string; lineDiscountTotal: string; invoiceDiscount: string;
  nonTaxableTotal: string; taxableTotal: string; vatAmount: string;
  grandTotal: string; amountPaid: string; fiscalYearName: string;
  items: Item[];
};
type Company = {
  legalName: string; displayName: string | null;
  registeredAddress: string; registeredAddress2: string | null;
  phone: string; phone2: string | null; email: string; panNumber: string;
} | null;

const DOC_LABEL: Record<string, string> = {
  INVOICE: "Tax Invoice", QUOTATION: "Quotation", SALES_ORDER: "Sales Order", CREDIT_NOTE: "Credit Note",
};

export function InvoiceDetailView({ doc, company }: { doc: Doc; company: Company }) {
  return (
    <>
      <PageHeader
        crumbs={["Sales", "Sales Invoice", doc.number]}
        title={doc.number}
        action={
          <div className="flex gap-2" data-app-chrome>
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
        <PrintLetterhead
          company={company}
          documentTitle={DOC_LABEL[doc.type] ?? doc.type}
          documentNumber={doc.number}
          documentDate={`${doc.date} (BS ${adToBs(doc.date)})`}
          meta={[{ label: "Fiscal Year", value: doc.fiscalYearName }]}
        />

        <div className="mb-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Bill To</div>
            <div className="mt-1 font-medium">{doc.customerName ?? "Cash / walk-in"}</div>
            {doc.customerPan && <div className="text-xs text-muted">PAN: {doc.customerPan}</div>}
          </div>
          <div className="sm:text-right">
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
              <th className="py-2 font-medium">HS Code</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Discount</th>
              <th className="py-2 text-right font-medium">VAT %</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {doc.items.map((it) => (
              <tr key={it.id}>
                <td className="py-2">{it.description}</td>
                <td className="py-2 text-xs text-muted">{it.hsCode ?? "—"}</td>
                <td className="py-2 text-right tabular-nums">{it.qty}</td>
                <td className="py-2 text-right tabular-nums">{it.rate}</td>
                <td className="py-2 text-right tabular-nums">{it.discount}</td>
                <td className="py-2 text-right tabular-nums">{it.taxRatePct}</td>
                <td className="py-2 text-right tabular-nums font-medium">{it.netAmount}</td>
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

        {doc.notes && (
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted">{doc.notes}</p>
        )}

        <div className="mt-16 flex justify-between text-xs text-muted">
          <div>Prepared by</div>
          <div>Authorized signature</div>
        </div>
      </Card>
    </>
  );
}
