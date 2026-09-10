import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const ledgerCreate = z.object({
  name: z.string().min(1).max(160),
  accountGroupId: z.string().min(1),
  openingBalance: z.coerce.number().min(0).default(0),
  openingType: z.enum(["DR", "CR"]).default("DR"),
  panNumber: z.string().max(20).optional().or(z.literal("")),
  description: z.string().max(300).optional().or(z.literal("")),
});
export const ledgerUpdate = ledgerCreate.partial();

export const contactCreate = z.object({
  name: z.string().min(1).max(160),
  contactKind: z.enum(["CUSTOMER", "SUPPLIER", "BOTH"]),
  parentLedgerCode: z.string().optional(), // AR/AP group to file under; defaults per kind
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  panNumber: z.string().max(20).optional().or(z.literal("")),
  iecNo: z.string().max(30).optional().or(z.literal("")),
  gstin: z.string().max(30).optional().or(z.literal("")),
  bankName: z.string().max(120).optional().or(z.literal("")),
  bankAccount: z.string().max(60).optional().or(z.literal("")),
  creditLimit: z.coerce.number().min(0).optional(),
  openingBalance: z.coerce.number().min(0).default(0),
  openingType: z.enum(["DR", "CR"]).default("DR"),
});
export const contactUpdate = contactCreate.partial();

const voucherLine = z
  .object({
    ledgerId: z.string().min(1),
    debit: z.coerce.number().min(0).default(0),
    credit: z.coerce.number().min(0).default(0),
    narration: z.string().max(300).optional().or(z.literal("")),
  })
  .refine((l) => (l.debit > 0) !== (l.credit > 0), {
    message: "Each row needs either a debit or a credit",
  });

export const voucherCreate = z.object({
  type: z.enum(["JOURNAL", "CONTRA"]).default("JOURNAL"),
  date: isoDate,
  narration: z.string().max(500).optional().or(z.literal("")),
  lines: z.array(voucherLine).min(2),
});

export type LedgerCreate = z.infer<typeof ledgerCreate>;
export type ContactCreate = z.infer<typeof contactCreate>;
export type VoucherCreate = z.infer<typeof voucherCreate>;
