export type TemplateItem = {
  id: string;
  description: string;
  hsCode: string | null;
  qty: string;
  rate: string;
  discount: string;
  taxRatePct: string;
  amount: string;
};

export type TemplateCompany = {
  legalName: string;
  displayName: string | null;
  registeredAddress: string;
  registeredAddress2: string | null;
  phone: string;
  phone2: string | null;
  email: string;
  panNumber: string;
  paymentQrUrl: string | null;
} | null;

export type TemplateBillFooter = {
  termsAndConditions: string | null;
  authorizedSignatory: string | null;
  footerNote: string | null;
  bankAccount: { bankName: string; accountName: string; accountNumber: string; branch: string | null } | null;
} | null;

export type TemplateInvoiceSetting = {
  showHsCode: boolean;
  showDiscountColumn: boolean;
  showBankDetails: boolean;
  showQrCode: boolean;
};

/** Data shape shared by every print template — both Sales and Purchase Invoice
 * detail pages map their own `doc` shape into this before rendering, so one
 * set of templates serves both document types (`partyLabel` reads "Bill To"
 * or "Supplier", `amountColumnLabel` reads "Amount" or "Landed Amount"). */
export type InvoiceTemplateData = {
  documentLabel: string;
  number: string;
  date: string;
  fiscalYearName: string;
  partyLabel: string;
  partyName: string;
  partyPan: string | null;
  referenceNo: string | null;
  paymentMode: string;
  status: string;
  amountColumnLabel: string;
  items: TemplateItem[];
  subtotal: string;
  lineDiscountTotal: string;
  invoiceDiscount: string;
  totalExciseDuty?: string;
  totalCustomDuty?: string;
  nonTaxableTotal: string;
  taxableTotal: string;
  vatAmount: string;
  grandTotal: string;
  amountPaid: string;
  notes: string | null;
  company: TemplateCompany;
  billFooter: TemplateBillFooter;
  invoiceSetting: TemplateInvoiceSetting;
};

export const TEMPLATE_OPTIONS = [
  { id: "CLASSIC", label: "Classic", size: "A4 Portrait", description: "Clean formal letterhead — the safe, universal default." },
  { id: "MODERN", label: "Modern", size: "A4 Portrait", description: "Bold colour-accented header and totals band, on-brand." },
  { id: "COMPACT", label: "Compact", size: "A5 Portrait", description: "Half-page layout for A5 paper or shorter invoices." },
  { id: "THERMAL", label: "Thermal Receipt", size: "80mm", description: "Narrow receipt-printer layout for POS counters." },
  { id: "DUAL_COPY", label: "Dual Copy", size: "A4 Portrait", description: "Original + Customer Copy stacked on one A4 sheet." },
] as const;

export type TemplateId = (typeof TEMPLATE_OPTIONS)[number]["id"];

export const DEFAULT_TEMPLATE: TemplateId = "CLASSIC";

export function isTemplateId(value: string): value is TemplateId {
  return TEMPLATE_OPTIONS.some((t) => t.id === value);
}
