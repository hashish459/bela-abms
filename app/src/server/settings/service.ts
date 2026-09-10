import "server-only";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { encryptSecret } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import { toIsoDate } from "@/lib/bs-date";
import type {
  CompanyInfoUpdate,
  FiscalYearCreate,
  TaxRateCreate,
} from "./schemas";

/* ─────────────────────────────  Fiscal years  ───────────────────────────── */

export async function listFiscalYears(companyId: string) {
  const rows = await db.fiscalYear.findMany({
    where: { companyId },
    orderBy: { startDate: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    startDate: toIsoDate(r.startDate),
    endDate: toIsoDate(r.endDate),
    description: r.description,
    active: r.active,
    isClosed: r.isClosed,
  }));
}

export async function createFiscalYear(
  companyId: string,
  actorId: string,
  input: FiscalYearCreate,
) {
  const dup = await db.fiscalYear.findUnique({
    where: { companyId_name: { companyId, name: input.name } },
  });
  if (dup) throw errors.conflict(`Fiscal year "${input.name}" already exists`);

  const created = await db.$transaction(async (tx) => {
    if (input.active) {
      await tx.fiscalYear.updateMany({ where: { companyId }, data: { active: false } });
    }
    return tx.fiscalYear.create({
      data: {
        companyId,
        name: input.name,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        description: input.description || null,
        active: input.active ?? false,
      },
    });
  });

  await writeAudit({
    userId: actorId, companyId, action: "CREATE",
    entity: "FiscalYear", entityId: created.id, meta: { name: created.name },
  });
  return created;
}

export async function updateFiscalYear(
  companyId: string,
  actorId: string,
  id: string,
  input: Partial<FiscalYearCreate>,
) {
  const existing = await db.fiscalYear.findFirst({ where: { id, companyId } });
  if (!existing) throw errors.notFound("Fiscal year not found");

  const updated = await db.$transaction(async (tx) => {
    if (input.active) {
      await tx.fiscalYear.updateMany({
        where: { companyId, id: { not: id } },
        data: { active: false },
      });
    }
    return tx.fiscalYear.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        description: input.description === undefined ? undefined : input.description || null,
        active: input.active ?? undefined,
      },
    });
  });

  await writeAudit({
    userId: actorId, companyId, action: "UPDATE",
    entity: "FiscalYear", entityId: id, meta: { name: updated.name },
  });
  return updated;
}

/* ─────────────────────────────  Tax rates  ──────────────────────────────── */

export async function listTaxRates(companyId: string) {
  return db.taxRate.findMany({
    where: { companyId, deletedAt: null },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true, name: true, ratePct: true, isNoTax: true, isSystem: true, isActive: true,
    },
  });
}

export async function createTaxRate(
  companyId: string,
  actorId: string,
  input: TaxRateCreate,
) {
  const dup = await db.taxRate.findFirst({
    where: { companyId, name: input.name, deletedAt: null },
  });
  if (dup) throw errors.conflict(`Tax "${input.name}" already exists`);

  const created = await db.taxRate.create({
    data: {
      companyId,
      name: input.name,
      ratePct: input.ratePct,
      isNoTax: input.isNoTax ?? input.ratePct === 0,
      isActive: input.isActive ?? true,
      isSystem: false,
    },
  });
  await writeAudit({
    userId: actorId, companyId, action: "CREATE",
    entity: "TaxRate", entityId: created.id, meta: { name: created.name },
  });
  return created;
}

export async function updateTaxRate(
  companyId: string,
  actorId: string,
  id: string,
  input: Partial<TaxRateCreate>,
) {
  const existing = await db.taxRate.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Tax rate not found");
  if (existing.isSystem && input.name && input.name !== existing.name)
    throw errors.badRequest("System tax rates cannot be renamed");

  const updated = await db.taxRate.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      ratePct: input.ratePct ?? undefined,
      isNoTax: input.isNoTax ?? undefined,
      isActive: input.isActive ?? undefined,
    },
  });
  await writeAudit({
    userId: actorId, companyId, action: "UPDATE", entity: "TaxRate", entityId: id,
  });
  return updated;
}

export async function deleteTaxRate(companyId: string, actorId: string, id: string) {
  const existing = await db.taxRate.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Tax rate not found");
  if (existing.isSystem) throw errors.badRequest("System tax rates cannot be deleted");

  await db.taxRate.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({
    userId: actorId, companyId, action: "DELETE", entity: "TaxRate", entityId: id,
  });
}

/* ────────────────────────────  Company info  ───────────────────────────── */

export async function getCompanyInfo(companyId: string) {
  const info = await db.companyInfo.findUnique({ where: { companyId } });
  if (!info) return null;
  // Never return the CBMS password; just whether one is set.
  const { cbmsPasswordCiphertext, ...rest } = info;
  return { ...rest, cbmsPasswordSet: Boolean(cbmsPasswordCiphertext) };
}

export async function upsertCompanyInfo(
  companyId: string,
  actorId: string,
  input: CompanyInfoUpdate,
) {
  const cbms =
    input.cbmsPassword && input.cbmsPassword.length > 0
      ? { cbmsPasswordCiphertext: encryptSecret(input.cbmsPassword) }
      : {};

  const data = {
    legalName: input.legalName,
    displayName: input.displayName || null,
    phone: input.phone,
    phone2: input.phone2 || null,
    email: input.email,
    website: input.website || null,
    panNumber: input.panNumber,
    eximCode: input.eximCode || null,
    cbmsUsername: input.cbmsUsername || null,
    registeredWithVat: input.registeredWithVat,
    separatePurchaseSalesTax: input.separatePurchaseSalesTax,
    syncWithIrd: input.syncWithIrd,
    registeredAddress: input.registeredAddress,
    registeredAddress2: input.registeredAddress2 || null,
    ...cbms,
  };

  const saved = await db.companyInfo.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
  });
  await writeAudit({
    userId: actorId, companyId, action: "UPDATE",
    entity: "CompanyInfo", entityId: saved.id,
  });
  return getCompanyInfo(companyId);
}
