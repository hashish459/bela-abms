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
  exciseDuty: z.coerce.number().min(0).default(0),
  customDuty: z.coerce.number().min(0).default(0),
  taxRateId: z.string().optional().or(z.literal("")),
  isNonTaxable: z.boolean().default(false),
  batchNo: z.string().max(60).optional().or(z.literal("")),
  expiryDate: isoDate.optional().or(z.literal("")),
});

const paymentMode = z.enum(["CREDIT", "CASH", "BANK", "CHEQUE", "WALLET"]);

const baseDoc = {
  date: isoDate,
  supplierLedgerId: z.string().min(1, "Select a supplier"),
  deliveryDate: isoDate.optional().or(z.literal("")),
  referenceNo: z.string().max(60).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  invoiceDiscount: z.coerce.number().min(0).default(0),
  lines: z.array(docLine).min(1),
};

export const purchaseOrderCreate = z.object({ ...baseDoc });

export const purchaseInvoiceCreate = z
  .object({
    ...baseDoc,
    supplierInvoiceNumber: z.string().min(1, "Supplier invoice number is required").max(60),
    paymentMode,
    paymentLedgerId: z.string().optional().or(z.literal("")),
    convertedFromId: z.string().optional().or(z.literal("")),
  })
  .refine((v) => v.paymentMode === "CREDIT" || !!v.paymentLedgerId, {
    message: "Select the cash / bank account paid from",
    path: ["paymentLedgerId"],
  });

export const supplierPaymentCreate = z.object({
  date: isoDate,
  supplierLedgerId: z.string().min(1),
  paymentLedgerId: z.string().min(1),
  againstDocId: z.string().optional().or(z.literal("")),
  amount: z.coerce.number().positive(),
  paymentMode,
  reference: z.string().max(60).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const debitNoteCreate = z.object({
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
        exciseDuty: z.coerce.number().min(0).default(0),
        customDuty: z.coerce.number().min(0).default(0),
        taxRateId: z.string().optional().or(z.literal("")),
        isNonTaxable: z.boolean().default(false),
      }),
    )
    .min(1),
});

export const convertInput = z.object({ toType: z.literal("INVOICE") });

export type PurchaseOrderCreate = z.infer<typeof purchaseOrderCreate>;
export type PurchaseInvoiceCreate = z.infer<typeof purchaseInvoiceCreate>;
export type SupplierPaymentCreate = z.infer<typeof supplierPaymentCreate>;
export type DebitNoteCreate = z.infer<typeof debitNoteCreate>;
