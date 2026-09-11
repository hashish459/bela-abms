import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { postVoucher, postOpeningBalance, nextNumber } from "./gl";
import { postStockMovement } from "@/server/inventory/stock";
import type { ContactCreate, LedgerCreate, VoucherCreate, StockJournalCreate } from "./schemas";

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
// Same two ledgers used everywhere goods stock is valued (sales/purchase/manufacturing) —
// see src/server/manufacturing/ledgers.ts for the fuller category map this mirrors.
const INVENTORY_ADJUSTMENT_LEDGER = "COS-01-0003"; // "Inventory Adjustment Account"
function inventoryLedgerCodeFor(role: string): string {
  return role === "RAW_MATERIAL" ? "INV-02-0001" : "INV-01-0001";
}

/* ───────────────────────────  Chart of accounts  ──────────────────────── */

export async function chartOfAccounts(companyId: string) {
  const heads = await db.accountHead.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    select: {
      id: true, code: true, name: true, accountType: true, currentType: true,
      financialType: true, isSystem: true,
      groups: {
        orderBy: { name: "asc" },
        select: {
          id: true, code: true, name: true, isSystem: true,
          ledgers: {
            where: { deletedAt: null },
            orderBy: { name: "asc" },
            select: {
              id: true, code: true, name: true, isSystem: true, isActive: true,
              openingBalance: true, openingType: true, contactKind: true,
            },
          },
        },
      },
    },
  });
  return heads.map((h) => ({
    ...h,
    groups: h.groups.map((g) => ({
      ...g,
      ledgers: g.ledgers.map((l) => ({
        ...l,
        openingBalance: l.openingBalance.toFixed(2),
      })),
    })),
  }));
}

export async function listGroups(companyId: string) {
  return db.accountGroup.findMany({
    where: { companyId, isActive: true },
    orderBy: { code: "asc" },
    select: {
      id: true, code: true, name: true,
      accountHead: { select: { name: true, code: true, accountType: true } },
    },
  });
}

/** Flat ledger list for pickers (voucher lines, payment modes, etc). */
export async function listLedgers(
  companyId: string,
  opts: { search?: string; groupCodes?: string[]; headCodes?: string[]; contactKind?: string } = {},
) {
  const where: Prisma.LedgerWhereInput = { companyId, deletedAt: null, isActive: true };
  if (opts.search)
    where.OR = [
      { name: { contains: opts.search, mode: "insensitive" } },
      { code: { contains: opts.search, mode: "insensitive" } },
    ];
  if (opts.groupCodes?.length)
    where.accountGroup = { code: { in: opts.groupCodes } };
  if (opts.headCodes?.length)
    where.accountGroup = { accountHead: { code: { in: opts.headCodes } } };
  if (opts.contactKind)
    where.contactKind = opts.contactKind as Prisma.EnumContactKindNullableFilter["equals"];

  const rows = await db.ledger.findMany({
    where,
    take: 50,
    orderBy: { name: "asc" },
    select: {
      id: true, code: true, name: true, contactKind: true,
      accountGroup: { select: { name: true, accountHead: { select: { code: true } } } },
    },
  });
  return rows.map((r) => ({
    id: r.id, code: r.code, name: r.name, contactKind: r.contactKind,
    groupName: r.accountGroup.name, headCode: r.accountGroup.accountHead.code,
  }));
}

export async function createLedger(
  companyId: string,
  fiscalYearId: string | null,
  actorId: string,
  input: LedgerCreate,
) {
  return db.$transaction(async (tx) => {
    const group = await tx.accountGroup.findFirst({
      where: { id: input.accountGroupId, companyId },
    });
    if (!group) throw errors.validation(null, "Invalid account group");

    const code = await allocateLedgerCode(companyId, group.code, tx);
    const opening = new Prisma.Decimal(input.openingBalance ?? 0);
    const created = await tx.ledger.create({
      data: {
        companyId,
        accountGroupId: group.id,
        code,
        name: input.name,
        openingBalance: opening,
        openingType: input.openingType ?? "DR",
        panNumber: input.panNumber || null,
      },
    });

    if (opening.gt(0)) {
      if (!fiscalYearId)
        throw errors.badRequest("An active fiscal year is required to set an opening balance");
      await postOpeningBalance(tx, {
        companyId, fiscalYearId, ledgerId: created.id,
        amount: opening, type: input.openingType ?? "DR", createdById: actorId,
      });
    }

    await writeAudit({
      userId: actorId, companyId, action: "CREATE", entity: "Ledger", entityId: created.id,
      meta: { code, name: created.name },
    });
    return created;
  });
}

export async function updateLedger(
  companyId: string,
  actorId: string,
  id: string,
  input: Partial<LedgerCreate>,
) {
  const existing = await db.ledger.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Ledger not found");

  const updated = await db.ledger.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      accountGroupId: input.accountGroupId ?? undefined,
      openingBalance:
        input.openingBalance === undefined
          ? undefined
          : new Prisma.Decimal(input.openingBalance),
      openingType: input.openingType ?? undefined,
      panNumber: input.panNumber === undefined ? undefined : input.panNumber || null,
    },
  });
  await writeAudit({
    userId: actorId, companyId, action: "UPDATE", entity: "Ledger", entityId: id,
  });
  return updated;
}

export async function deleteLedger(companyId: string, actorId: string, id: string) {
  const existing = await db.ledger.findFirst({ where: { id, companyId, deletedAt: null } });
  if (!existing) throw errors.notFound("Ledger not found");
  if (existing.isSystem) throw errors.badRequest("System accounts cannot be deleted");

  const used = await db.voucherLine.count({ where: { ledgerId: id } });
  if (used > 0)
    throw errors.conflict("This account has transactions and cannot be deleted");

  await db.ledger.update({ where: { id }, data: { deletedAt: new Date() } });
  await writeAudit({
    userId: actorId, companyId, action: "DELETE", entity: "Ledger", entityId: id,
  });
}

/** Next code within a group: `<groupCode>-<0001>`. */
async function allocateLedgerCode(
  companyId: string,
  groupCode: string,
  client: Prisma.TransactionClient | typeof db = db,
): Promise<string> {
  const last = await client.ledger.findFirst({
    where: { companyId, code: { startsWith: `${groupCode}-` } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const n = last ? Number(last.code.slice(groupCode.length + 1)) + 1 : 1;
  return `${groupCode}-${String(n).padStart(4, "0")}`;
}

/* ─────────────────────────────  Contacts  ─────────────────────────────── */

const PARENT_GROUP: Record<string, string> = {
  CUSTOMER: "TRR-01", // Trade Receivable
  SUPPLIER: "TRP-01", // Trade Payable
};

export async function listContacts(
  companyId: string,
  kind: "CUSTOMER" | "SUPPLIER",
  search?: string,
) {
  const rows = await db.ledger.findMany({
    where: {
      companyId,
      deletedAt: null,
      contactKind: { in: kind === "CUSTOMER" ? ["CUSTOMER", "BOTH"] : ["SUPPLIER", "BOTH"] },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { panNumber: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true, code: true, name: true, panNumber: true, phone: true, email: true,
      address: true, creditLimit: true, openingBalance: true, openingType: true, contactKind: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    creditLimit: r.creditLimit?.toFixed(2) ?? null,
    openingBalance: r.openingBalance.toFixed(2),
  }));
}

export async function createContact(
  companyId: string,
  fiscalYearId: string | null,
  actorId: string,
  input: ContactCreate,
) {
  const groupCode =
    input.parentLedgerCode ??
    PARENT_GROUP[input.contactKind === "BOTH" ? "CUSTOMER" : input.contactKind];

  return db.$transaction(async (tx) => {
    const group = await tx.accountGroup.findFirst({ where: { companyId, code: groupCode } });
    if (!group) throw errors.validation(null, "Parent ledger group not found");

    const code = await allocateLedgerCode(companyId, group.code, tx);
    const opening = new Prisma.Decimal(input.openingBalance ?? 0);
    const created = await tx.ledger.create({
      data: {
        companyId,
        accountGroupId: group.id,
        code,
        name: input.name,
        contactKind: input.contactKind,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        panNumber: input.panNumber || null,
        iecNo: input.iecNo || null,
        gstin: input.gstin || null,
        bankName: input.bankName || null,
        bankAccount: input.bankAccount || null,
        creditLimit:
          input.creditLimit === undefined ? null : new Prisma.Decimal(input.creditLimit),
        openingBalance: opening,
        openingType: input.openingType ?? "DR",
      },
    });

    if (opening.gt(0)) {
      if (!fiscalYearId)
        throw errors.badRequest("An active fiscal year is required to set an opening balance");
      await postOpeningBalance(tx, {
        companyId, fiscalYearId, ledgerId: created.id,
        amount: opening, type: input.openingType ?? "DR", createdById: actorId,
      });
    }

    await writeAudit({
      userId: actorId, companyId, action: "CREATE", entity: "Contact", entityId: created.id,
      meta: { name: created.name, kind: input.contactKind },
    });
    return created;
  });
}

export async function updateContact(
  companyId: string,
  actorId: string,
  id: string,
  input: Partial<ContactCreate>,
) {
  const existing = await db.ledger.findFirst({
    where: { id, companyId, deletedAt: null, contactKind: { not: null } },
  });
  if (!existing) throw errors.notFound("Contact not found");

  const updated = await db.ledger.update({
    where: { id },
    data: {
      name: input.name ?? undefined,
      contactKind: input.contactKind ?? undefined,
      phone: input.phone === undefined ? undefined : input.phone || null,
      email: input.email === undefined ? undefined : input.email || null,
      address: input.address === undefined ? undefined : input.address || null,
      panNumber: input.panNumber === undefined ? undefined : input.panNumber || null,
      iecNo: input.iecNo === undefined ? undefined : input.iecNo || null,
      gstin: input.gstin === undefined ? undefined : input.gstin || null,
      bankName: input.bankName === undefined ? undefined : input.bankName || null,
      bankAccount: input.bankAccount === undefined ? undefined : input.bankAccount || null,
      creditLimit:
        input.creditLimit === undefined
          ? undefined
          : new Prisma.Decimal(input.creditLimit),
    },
  });
  await writeAudit({
    userId: actorId, companyId, action: "UPDATE", entity: "Contact", entityId: id,
  });
  return updated;
}

/* ───────────────────────  Manual vouchers (journal / contra)  ─────────── */

export async function createVoucher(
  companyId: string,
  fiscalYearId: string | null,
  actorId: string,
  input: VoucherCreate,
) {
  if (!fiscalYearId) throw errors.badRequest("No active fiscal year");

  return db.$transaction(async (tx) => {
    // Contra vouchers may only touch cash & bank accounts.
    if (input.type === "CONTRA") {
      const ledgerIds = input.lines.map((l) => l.ledgerId);
      const nonCash = await tx.ledger.count({
        where: {
          id: { in: ledgerIds },
          companyId,
          accountGroup: { accountHead: { code: "CCE" } },
        },
      });
      if (nonCash !== new Set(ledgerIds).size)
        throw errors.validation(null, "Contra vouchers may only use cash & bank accounts");
    }

    return postVoucher(tx, {
      companyId,
      fiscalYearId,
      date: new Date(input.date),
      type: input.type,
      narration: input.narration || undefined,
      createdById: actorId,
      lines: input.lines.map((l) => ({
        ledgerId: l.ledgerId,
        debit: l.debit,
        credit: l.credit,
        narration: l.narration || undefined,
      })),
    });
  });
}

/**
 * Stock Journal — the one gap Inventory Adjustment deliberately doesn't cover
 * (Docs/PROGRESS.md session 6: "stock write-offs don't post GL valuation
 * entry yet"). Inventory Adjustment changes quantity only, with no GL
 * impact — fine for a routine recount. A Stock Journal is for when a
 * quantity change ALSO needs to hit the books as a value gain/loss (theft,
 * breakage, a found-stock correction): it posts both the stock movement AND
 * a balanced voucher against the NFRS "Inventory Adjustment Account".
 */
export async function createStockJournal(
  companyId: string,
  fiscalYearId: string | null,
  actorId: string,
  input: StockJournalCreate,
) {
  if (!fiscalYearId) throw errors.badRequest("No active fiscal year");

  return db.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: input.productId, companyId, deletedAt: null },
      select: { id: true, name: true, kind: true, inventoryRole: true },
    });
    if (!product) throw errors.validation(null, "Product not found");
    if (product.kind !== "GOODS") throw errors.validation(null, `"${product.name}" is not a stocked (GOODS) product`);

    const warehouse = await tx.warehouse.findFirst({ where: { id: input.warehouseId, companyId, deletedAt: null }, select: { id: true } });
    if (!warehouse) throw errors.validation(null, "Warehouse not found");

    const amount = D(Math.abs(input.qty)).mul(input.unitCost);

    await postStockMovement(tx, {
      companyId, fiscalYearId, date: new Date(input.date),
      kind: input.qty > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
      sourceType: "StockJournal", createdById: actorId,
      lines: [{ productId: product.id, warehouseId: warehouse.id, qty: Math.abs(input.qty).toString(), unitCost: input.unitCost.toString() }],
    });

    const inventoryLedgerId = await ledgerId(tx, companyId, inventoryLedgerCodeFor(product.inventoryRole));
    const adjustmentLedgerId = await ledgerId(tx, companyId, INVENTORY_ADJUSTMENT_LEDGER);

    return postVoucher(tx, {
      companyId, fiscalYearId, date: new Date(input.date), type: "STOCK",
      narration: input.narration || `Stock journal — ${product.name}`,
      sourceType: "StockJournal", createdById: actorId,
      lines: input.qty > 0
        ? [
            { ledgerId: inventoryLedgerId, debit: amount.toFixed(2), narration: product.name },
            { ledgerId: adjustmentLedgerId, credit: amount.toFixed(2) },
          ]
        : [
            { ledgerId: adjustmentLedgerId, debit: amount.toFixed(2) },
            { ledgerId: inventoryLedgerId, credit: amount.toFixed(2), narration: product.name },
          ],
    });
  });
}

async function ledgerId(tx: Prisma.TransactionClient, companyId: string, code: string): Promise<string> {
  const l = await tx.ledger.findFirst({ where: { companyId, code, deletedAt: null }, select: { id: true } });
  if (!l) throw errors.validation(null, `System account ${code} is missing — re-run the seed`);
  return l.id;
}

export async function listVouchers(
  companyId: string,
  fiscalYearId: string | null,
  type: "JOURNAL" | "CONTRA" | "STOCK",
  opts: { page?: number; pageSize?: number; search?: string } = {},
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, opts.pageSize ?? 10);
  const where: Prisma.VoucherWhereInput = {
    companyId,
    type,
    ...(fiscalYearId ? { fiscalYearId } : {}),
    ...(opts.search
      ? { OR: [{ number: { contains: opts.search, mode: "insensitive" } }, { narration: { contains: opts.search, mode: "insensitive" } }] }
      : {}),
  };
  const [rows, total] = await Promise.all([
    db.voucher.findMany({
      where,
      orderBy: [{ date: "desc" }, { number: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, number: true, date: true, narration: true,
        lines: { select: { debit: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    }),
    db.voucher.count({ where }),
  ]);
  return {
    rows: rows.map((v) => ({
      id: v.id,
      number: v.number,
      date: v.date.toISOString().slice(0, 10),
      narration: v.narration,
      amount: v.lines
        .reduce((a, l) => a.add(l.debit), new Prisma.Decimal(0))
        .toFixed(2),
      by: v.createdBy ? `${v.createdBy.firstName} ${v.createdBy.lastName}`.trim() : "",
    })),
    total,
    page,
    pageSize,
  };
}

export async function getVoucher(companyId: string, id: string) {
  const v = await db.voucher.findFirst({
    where: { id, companyId },
    select: {
      id: true, number: true, date: true, type: true, narration: true,
      lines: {
        orderBy: { order: "asc" },
        select: {
          debit: true, credit: true, narration: true,
          ledger: { select: { id: true, code: true, name: true } },
        },
      },
    },
  });
  if (!v) throw errors.notFound("Voucher not found");
  return {
    ...v,
    date: v.date.toISOString().slice(0, 10),
    lines: v.lines.map((l) => ({
      ledgerId: l.ledger.id,
      ledgerCode: l.ledger.code,
      ledgerName: l.ledger.name,
      debit: l.debit.toFixed(2),
      credit: l.credit.toFixed(2),
      narration: l.narration,
    })),
  };
}

// re-export for API consumers
export { nextNumber };
