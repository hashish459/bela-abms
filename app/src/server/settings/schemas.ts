import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const fiscalYearBase = z.object({
  name: z.string().min(1).max(20),
  startDate: isoDate,
  endDate: isoDate,
  description: z.string().max(500).optional().or(z.literal("")),
  active: z.boolean().optional(),
});

const rangeOk = (v: { startDate?: string; endDate?: string }) =>
  !v.startDate || !v.endDate || v.startDate < v.endDate;
const rangeMsg = { message: "Start date must be before end date", path: ["endDate"] };

export const fiscalYearCreate = fiscalYearBase.refine(rangeOk, rangeMsg);
export const fiscalYearUpdate = fiscalYearBase.partial().refine(rangeOk, rangeMsg);

export const taxRateCreate = z.object({
  name: z.string().min(1).max(60),
  ratePct: z.coerce.number().min(0).max(100),
  isNoTax: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const taxRateUpdate = taxRateCreate.partial();

export const companyInfoUpdate = z.object({
  legalName: z.string().min(1).max(200),
  displayName: z.string().max(200).optional().or(z.literal("")),
  phone: z.string().min(1).max(30),
  phone2: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email(),
  website: z.string().max(200).optional().or(z.literal("")),
  panNumber: z.string().min(1).max(20),
  eximCode: z.string().max(30).optional().or(z.literal("")),
  cbmsUsername: z.string().max(100).optional().or(z.literal("")),
  cbmsPassword: z.string().max(200).optional(), // write-only; blank = keep existing
  registeredWithVat: z.boolean(),
  separatePurchaseSalesTax: z.boolean(),
  syncWithIrd: z.boolean(),
  registeredAddress: z.string().min(1).max(300),
  registeredAddress2: z.string().max(300).optional().or(z.literal("")),
});

export type FiscalYearCreate = z.infer<typeof fiscalYearCreate>;
export type TaxRateCreate = z.infer<typeof taxRateCreate>;
export type CompanyInfoUpdate = z.infer<typeof companyInfoUpdate>;
