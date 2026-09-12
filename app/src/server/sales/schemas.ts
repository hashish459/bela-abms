import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const docLine = z.object({
  productId: z.string().optional().or(z.literal("")),
  description: z.string().min(1).max(300),
  hsCode: z.string().max(20).optional().or(z.literal("")),
  warehouseId: z.string().optional().or(z.literal("")),
  qty: z.coerce.number().positive(),
  rate: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
  taxRateId: z.string().optional().or(z.literal("")),
  isNonTaxable: z.boolean().default(false),
  batchId: z.string().optional().or(z.literal("")),
});

const paymentMode = z.enum(["CREDIT", "CASH", "BANK", "CHEQUE", "WALLET"]);

const baseDoc = {
  date: isoDate,
  customerLedgerId: z.string().optional().or(z.literal("")),
  customerName: z.string().max(160).optional().or(z.literal("")),
  customerPan: z.string().max(20).optional().or(z.literal("")),
  deliveryDate: isoDate.optional().or(z.literal("")),
  creditDays: z.coerce.number().int().min(0).optional(),
  referenceNo: z.string().max(60).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  invoiceDiscount: z.coerce.number().min(0).default(0),
  lines: z.array(docLine).min(1),
  customFields: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
};

export const draftCreate = z
  .object({
    type: z.enum(["QUOTATION", "SALES_ORDER"]),
    ...baseDoc,
  })
  .refine((v) => v.customerLedgerId || v.customerName, {
    message: "Select a customer or enter a name",
    path: ["customerLedgerId"],
  });

export const invoiceCreate = z
  .object({
    ...baseDoc,
    paymentMode,
    paymentLedgerId: z.string().optional().or(z.literal("")),
    convertedFromId: z.string().optional().or(z.literal("")),
  })
  .refine((v) => v.paymentMode === "CREDIT" ? !!v.customerLedgerId : (v.customerLedgerId || v.customerName), {
    message: "Credit sales need a registered customer",
    path: ["customerLedgerId"],
  })
  .refine((v) => v.paymentMode === "CREDIT" || !!v.paymentLedgerId, {
    message: "Select the cash / bank account that received payment",
    path: ["paymentLedgerId"],
  });

export const receiptCreate = z.object({
  date: isoDate,
  customerLedgerId: z.string().min(1),
  paymentLedgerId: z.string().min(1),
  againstDocId: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().positive(),
  paymentMode,
  reference: z.string().max(60).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const creditNoteCreate = z.object({
  date: isoDate,
  reversesDocId: z.string().min(1),
  notes: z.string().max(1000).optional().or(z.literal("")),
  lines: z
    .array(
      z.object({
        productId: z.string().optional().or(z.literal("")),
        description: z.string().min(1).max(300),
        hsCode: z.string().max(20).optional().or(z.literal("")),
        warehouseId: z.string().optional().or(z.literal("")),
        qty: z.coerce.number().positive(),
        rate: z.coerce.number().min(0),
        discount: z.coerce.number().min(0).default(0),
        taxRateId: z.string().optional().or(z.literal("")),
        isNonTaxable: z.boolean().default(false),
      }),
    )
    .min(1),
});

export const convertInput = z.object({
  toType: z.enum(["SALES_ORDER", "INVOICE"]),
});

export const setCustomStatusInput = z.object({
  customStatusId: z.string().nullable(),
});

export type DraftCreate = z.infer<typeof draftCreate>;
export type InvoiceCreate = z.infer<typeof invoiceCreate>;
export type ReceiptCreate = z.infer<typeof receiptCreate>;
export type CreditNoteCreate = z.infer<typeof creditNoteCreate>;
