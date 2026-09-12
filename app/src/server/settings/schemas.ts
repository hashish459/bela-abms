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

/* ───────────────────────────  Signin & Security  ────────────────────────── */

export const changePassword = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

/* ────────────────────────────  Users & Roles  ───────────────────────────── */

export const userCreate = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  email: z.string().email(),
  phone: z.string().max(30).optional().or(z.literal("")),
  password: z.string().min(8).max(200),
  userType: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
  roleIds: z.array(z.string()).default([]),
});

export const userUpdate = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: z.string().max(30).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  roleIds: z.array(z.string()).optional(),
});

const permAction = z.object({
  canCreate: z.boolean().default(false),
  canRead: z.boolean().default(false),
  canUpdate: z.boolean().default(false),
  canDelete: z.boolean().default(false),
});

export const roleCreate = z.object({
  name: z.string().min(1).max(80),
  permissions: z.record(z.string(), permAction).default({}), // moduleKey -> actions
});

export const roleUpdate = z.object({
  name: z.string().min(1).max(80).optional(),
  permissions: z.record(z.string(), permAction).optional(),
});

export const branchCreate = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(300).optional().or(z.literal("")),
});

/* ────────────────────────────────  Banks  ───────────────────────────────── */

export const bankCreate = z.object({ name: z.string().min(1).max(120) });
export const bankUpdate = z.object({ name: z.string().min(1).max(120).optional(), isActive: z.boolean().optional() });

export const bankAccountCreate = z.object({
  bankId: z.string().min(1),
  accountName: z.string().min(1).max(150),
  accountNumber: z.string().min(1).max(60),
  branch: z.string().max(120).optional().or(z.literal("")),
  swiftCode: z.string().max(30).optional().or(z.literal("")),
  ledgerId: z.string().optional().or(z.literal("")),
  isDefault: z.boolean().optional(),
});
export const bankAccountUpdate = bankAccountCreate.partial();

/* ─────────────────────────────  Custom fields  ──────────────────────────── */

export const customFieldCreate = z.object({
  module: z.string().min(1).max(60),
  label: z.string().min(1).max(120),
  fieldType: z.enum(["TEXT", "NUMBER", "DATE", "SELECT", "CHECKBOX"]),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});
export const customFieldUpdate = customFieldCreate.partial().extend({ isActive: z.boolean().optional() });

/* ─────────────────────────────  Custom status  ──────────────────────────── */

export const customStatusCreate = z.object({
  module: z.string().min(1).max(60),
  label: z.string().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});
export const customStatusUpdate = customStatusCreate.partial().extend({ isActive: z.boolean().optional() });

/* ─────────────────────────────────  Barcode  ─────────────────────────────── */

export const barcodeSettingUpdate = z.object({
  symbology: z.enum(["CODE128", "EAN13"]),
  prefix: z.string().max(10).optional().or(z.literal("")),
  nextNumber: z.coerce.number().int().min(1),
  labelWidthMm: z.coerce.number().int().min(10).max(200),
  labelHeightMm: z.coerce.number().int().min(10).max(200),
  showPrice: z.boolean(),
  showName: z.boolean(),
});

/* ─────────────────────────────  Invoice setting  ────────────────────────── */

export const invoiceSettingUpdate = z.object({
  showHsCode: z.boolean(),
  showDiscountColumn: z.boolean(),
  showBankDetails: z.boolean(),
  showQrCode: z.boolean(),
  defaultTermsText: z.string().max(2000).optional().or(z.literal("")),
  defaultNotes: z.string().max(2000).optional().or(z.literal("")),
});

/* ─────────────────────────  Invoice import template  ────────────────────── */

export const invoiceImportTemplateCreate = z.object({
  name: z.string().min(1).max(120),
  columnMap: z.record(z.string(), z.string()),
  isDefault: z.boolean().optional(),
});
export const invoiceImportTemplateUpdate = invoiceImportTemplateCreate.partial();

/* ─────────────────────────────────  Bill footer  ─────────────────────────── */

export const billFooterUpdate = z.object({
  termsAndConditions: z.string().max(4000).optional().or(z.literal("")),
  bankAccountId: z.string().optional().or(z.literal("")),
  authorizedSignatory: z.string().max(150).optional().or(z.literal("")),
  footerNote: z.string().max(500).optional().or(z.literal("")),
});

export type FiscalYearCreate = z.infer<typeof fiscalYearCreate>;
export type TaxRateCreate = z.infer<typeof taxRateCreate>;
export type CompanyInfoUpdate = z.infer<typeof companyInfoUpdate>;
export type ChangePassword = z.infer<typeof changePassword>;
export type UserCreate = z.infer<typeof userCreate>;
export type UserUpdate = z.infer<typeof userUpdate>;
export type RoleCreate = z.infer<typeof roleCreate>;
export type RoleUpdate = z.infer<typeof roleUpdate>;
export type BranchCreate = z.infer<typeof branchCreate>;
export type BankCreate = z.infer<typeof bankCreate>;
export type BankUpdate = z.infer<typeof bankUpdate>;
export type BankAccountCreate = z.infer<typeof bankAccountCreate>;
export type BankAccountUpdate = z.infer<typeof bankAccountUpdate>;
export type CustomFieldCreate = z.infer<typeof customFieldCreate>;
export type CustomFieldUpdate = z.infer<typeof customFieldUpdate>;
export type CustomStatusCreate = z.infer<typeof customStatusCreate>;
export type CustomStatusUpdate = z.infer<typeof customStatusUpdate>;
export type BarcodeSettingUpdate = z.infer<typeof barcodeSettingUpdate>;
export type InvoiceSettingUpdate = z.infer<typeof invoiceSettingUpdate>;
export type InvoiceImportTemplateCreate = z.infer<typeof invoiceImportTemplateCreate>;
export type InvoiceImportTemplateUpdate = z.infer<typeof invoiceImportTemplateUpdate>;
export type BillFooterUpdate = z.infer<typeof billFooterUpdate>;
