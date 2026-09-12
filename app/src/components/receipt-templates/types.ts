import type { TemplateCompany } from "@/components/invoice-templates";

/** Data shape for the Receipt print template(s). Deliberately separate from
 * `InvoiceTemplateData` — a payment receipt has no line-item table, so
 * reusing the invoice shape would carry a lot of unused fields. Reuses
 * `TemplateCompany` from invoice-templates rather than redefining it. */
export type ReceiptTemplateData = {
  number: string;
  date: string;
  fiscalYearName: string;
  customerName: string;
  customerPan: string | null;
  amount: string;
  paymentMode: string;
  paymentLedgerName: string;
  againstNumber: string | null;
  reference: string | null;
  notes: string | null;
  company: TemplateCompany;
  authorizedSignatory: string | null;
};

export const RECEIPT_TEMPLATE_OPTIONS = [
  { id: "CLASSIC", label: "Classic", size: "A5 Landscape", description: "Clean formal payment receipt — the safe, universal default." },
  { id: "MODERN", label: "Modern", size: "A5 Landscape", description: "Navy/orange brand-accented header and callout band, on-brand." },
  { id: "THERMAL", label: "Thermal Receipt", size: "80mm", description: "Narrow receipt-printer layout — the most common way a receipt is actually handed over." },
  { id: "COMPACT", label: "Compact", size: "A6", description: "Dense voucher-book-style layout, no logo, minimal spacing." },
] as const;

export type ReceiptTemplateId = (typeof RECEIPT_TEMPLATE_OPTIONS)[number]["id"];

export const DEFAULT_RECEIPT_TEMPLATE: ReceiptTemplateId = "CLASSIC";
