import "server-only";
import { Prisma, type VoucherType } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

type Tx = Prisma.TransactionClient;

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const round2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

export type VoucherLineInput = {
  ledgerId: string;
  debit?: number | string;
  credit?: number | string;
  narration?: string;
};

export type PostVoucherInput = {
  companyId: string;
  fiscalYearId: string;
  date: Date;
  type: VoucherType;
  narration?: string;
  lines: VoucherLineInput[];
  sourceType?: string;
  sourceId?: string;
  createdById?: string;
};

const NUMBER_PREFIX: Record<VoucherType, string> = {
  OPENING: "OP",
  JOURNAL: "JV",
  CONTRA: "CV",
  STOCK: "SV",
  SALES: "SA",
  PURCHASE: "PU",
  RECEIPT: "RC",
  PAYMENT: "PM",
  CREDIT_NOTE: "CN",
  DEBIT_NOTE: "DN",
  EXPENSE: "EX",
  ASSET: "FA",
  DEPRECIATION: "DEP",
  ASSET_DISPOSAL: "AD",
};

/**
 * Reserve the next gap-free number for (company, fiscalYear, key). Uses an atomic
 * upsert + increment; callers must be inside a transaction that also writes the doc,
 * so a rolled-back doc does not consume a number.
 */
export async function nextNumber(
  tx: Tx,
  companyId: string,
  fiscalYearId: string,
  key: string,
): Promise<number> {
  const row = await tx.numberSequence.upsert({
    where: { companyId_fiscalYearId_key: { companyId, fiscalYearId, key } },
    create: { companyId, fiscalYearId, key, nextValue: 2 },
    update: { nextValue: { increment: 1 } },
  });
  // On create nextValue is 2 and we return 1; on update it was incremented so subtract 1.
  return row.nextValue - 1;
}

export function formatVoucherNumber(type: VoucherType, fyName: string, seq: number): string {
  return `${NUMBER_PREFIX[type]}-${fyName.replace("-", "/")}-${String(seq).padStart(4, "0")}`;
}

/**
 * THE single writer of general-ledger entries. Every financial document (invoice,
 * receipt, payment, manual voucher) posts through here. Enforces Σdebit = Σcredit.
 */
export async function postVoucher(tx: Tx, input: PostVoucherInput) {
  if (input.lines.length < 2)
    throw errors.validation(null, "A voucher needs at least two lines");

  let sumDr = D(0);
  let sumCr = D(0);
  const normalized = input.lines.map((l, i) => {
    const debit = round2(D(l.debit ?? 0));
    const credit = round2(D(l.credit ?? 0));
    if (debit.lt(0) || credit.lt(0))
      throw errors.validation(null, "Debit / credit cannot be negative");
    if (debit.gt(0) && credit.gt(0))
      throw errors.validation(null, "A line cannot have both debit and credit");
    if (debit.eq(0) && credit.eq(0))
      throw errors.validation(null, "Every line needs a debit or a credit amount");
    sumDr = sumDr.add(debit);
    sumCr = sumCr.add(credit);
    return {
      ledgerId: l.ledgerId,
      debit,
      credit,
      narration: l.narration ?? null,
      order: i,
    };
  });

  if (!sumDr.equals(sumCr))
    throw errors.validation(
      { debit: sumDr.toFixed(2), credit: sumCr.toFixed(2) },
      `Voucher is out of balance by ${sumDr.sub(sumCr).abs().toFixed(2)}`,
    );

  // guard: every ledger belongs to this company and is active
  const ledgerIds = [...new Set(normalized.map((l) => l.ledgerId))];
  const ledgers = await tx.ledger.findMany({
    where: { id: { in: ledgerIds }, companyId: input.companyId, deletedAt: null },
    select: { id: true, isActive: true },
  });
  if (ledgers.length !== ledgerIds.length)
    throw errors.validation(null, "One or more accounts are invalid");
  if (ledgers.some((l) => !l.isActive))
    throw errors.validation(null, "One or more accounts are inactive");

  const fy = await tx.fiscalYear.findFirst({
    where: { id: input.fiscalYearId, companyId: input.companyId },
    select: { name: true, isClosed: true },
  });
  if (!fy) throw errors.validation(null, "Invalid fiscal year");
  if (fy.isClosed) throw errors.validation(null, "Fiscal year is closed");

  const seq = await nextNumber(
    tx,
    input.companyId,
    input.fiscalYearId,
    `voucher:${input.type}`,
  );
  const number = formatVoucherNumber(input.type, fy.name, seq);

  const voucher = await tx.voucher.create({
    data: {
      companyId: input.companyId,
      fiscalYearId: input.fiscalYearId,
      number,
      date: input.date,
      type: input.type,
      narration: input.narration ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      createdById: input.createdById ?? null,
      lines: { create: normalized },
    },
    include: { lines: true },
  });

  await writeAudit({
    userId: input.createdById,
    companyId: input.companyId,
    action: "POST_VOUCHER",
    entity: "Voucher",
    entityId: voucher.id,
    meta: { number, type: input.type, amount: sumDr.toFixed(2) },
  });

  return voucher;
}

/**
 * Post the OPENING voucher for a ledger's opening balance, balanced against the
 * "Opening Balance Adjustment" suspense account, so the trial balance always ties.
 * No-op for a zero opening balance.
 */
export async function postOpeningBalance(
  tx: Tx,
  args: {
    companyId: string;
    fiscalYearId: string;
    ledgerId: string;
    amount: Prisma.Decimal.Value;
    type: "DR" | "CR";
    createdById?: string;
  },
) {
  const amt = round2(D(args.amount));
  if (amt.lte(0)) return null;

  const suspense = await tx.ledger.findFirst({
    where: { companyId: args.companyId, code: "R&S-02-0002", deletedAt: null },
    select: { id: true },
  });
  if (!suspense) throw errors.validation(null, "Opening Balance Adjustment account is missing");

  const fy = await tx.fiscalYear.findUnique({
    where: { id: args.fiscalYearId },
    select: { startDate: true },
  });

  return postVoucher(tx, {
    companyId: args.companyId,
    fiscalYearId: args.fiscalYearId,
    date: fy?.startDate ?? new Date(),
    type: "OPENING",
    narration: "Opening balance",
    sourceType: "Ledger:opening",
    sourceId: args.ledgerId,
    createdById: args.createdById,
    lines:
      args.type === "DR"
        ? [
            { ledgerId: args.ledgerId, debit: amt.toString() },
            { ledgerId: suspense.id, credit: amt.toString() },
          ]
        : [
            { ledgerId: args.ledgerId, credit: amt.toString() },
            { ledgerId: suspense.id, debit: amt.toString() },
          ],
  });
}

/** Reverse a posted voucher by posting its mirror (used when a source doc is cancelled). */
export async function reverseVoucher(
  tx: Tx,
  companyId: string,
  sourceType: string,
  sourceId: string,
  createdById?: string,
) {
  const original = await tx.voucher.findFirst({
    where: { companyId, sourceType, sourceId },
    include: { lines: true, fiscalYear: true },
  });
  if (!original) return null;
  return postVoucher(tx, {
    companyId,
    fiscalYearId: original.fiscalYearId,
    date: new Date(),
    type: original.type,
    narration: `Reversal of ${original.number}`,
    sourceType: `${sourceType}:reversal`,
    sourceId,
    createdById,
    lines: original.lines.map((l) => ({
      ledgerId: l.ledgerId,
      debit: l.credit.toString(),
      credit: l.debit.toString(),
    })),
  });
}

/* ─────────────────────────  Balances / reports  ────────────────────── */

export type LedgerBalance = {
  ledgerId: string;
  debit: string;
  credit: string;
  balance: string; // signed: +DR / -CR relative to natural side
  balanceType: "DR" | "CR";
};

/**
 * Trial balance for a fiscal year (optionally as-of a date). Opening balances +
 * period movement, grouped up the account hierarchy by the caller.
 */
export async function trialBalance(
  companyId: string,
  fiscalYearId: string,
  opts: { asOf?: Date } = {},
) {
  // Opening balances are posted as OPENING vouchers (postOpeningBalance), so they are
  // already in VoucherLine — we do NOT add Ledger.openingBalance again here.
  const ledgers = await db.ledger.findMany({
    where: { companyId, deletedAt: null },
    select: {
      id: true, code: true, name: true,
      accountGroup: {
        select: {
          code: true, name: true,
          accountHead: { select: { code: true, name: true, accountType: true } },
        },
      },
    },
    orderBy: { code: "asc" },
  });

  const movements = await db.voucherLine.groupBy({
    by: ["ledgerId"],
    where: {
      voucher: {
        companyId,
        fiscalYearId,
        ...(opts.asOf ? { date: { lte: opts.asOf } } : {}),
      },
    },
    _sum: { debit: true, credit: true },
  });
  const moveById = new Map(movements.map((m) => [m.ledgerId, m._sum]));

  const rows = ledgers.map((l) => {
    const m = moveById.get(l.id);
    const dr = D(m?.debit ?? 0);
    const cr = D(m?.credit ?? 0);
    const net = dr.sub(cr);
    return {
      ledgerId: l.id,
      code: l.code,
      name: l.name,
      groupCode: l.accountGroup.code,
      groupName: l.accountGroup.name,
      headCode: l.accountGroup.accountHead.code,
      headName: l.accountGroup.accountHead.name,
      accountType: l.accountGroup.accountHead.accountType,
      debit: round2(dr).toFixed(2),
      credit: round2(cr).toFixed(2),
      closing: round2(net.abs()).toFixed(2),
      closingType: net.gte(0) ? "DR" : "CR",
    };
  });

  const totalDr = rows.reduce((a, r) => a.add(r.debit), D(0));
  const totalCr = rows.reduce((a, r) => a.add(r.credit), D(0));

  return {
    rows: rows.filter((r) => r.debit !== "0.00" || r.credit !== "0.00"),
    allRows: rows,
    totals: { debit: round2(totalDr).toFixed(2), credit: round2(totalCr).toFixed(2) },
  };
}

/** Running ledger statement for one account. */
export async function ledgerStatement(
  companyId: string,
  fiscalYearId: string,
  ledgerId: string,
) {
  const ledger = await db.ledger.findFirst({
    where: { id: ledgerId, companyId, deletedAt: null },
    select: { id: true, code: true, name: true },
  });
  if (!ledger) throw errors.notFound("Ledger not found");

  const lines = await db.voucherLine.findMany({
    where: { ledgerId, voucher: { companyId, fiscalYearId } },
    select: {
      debit: true, credit: true, narration: true,
      voucher: { select: { number: true, date: true, type: true, narration: true } },
    },
    orderBy: [{ voucher: { date: "asc" } }, { voucher: { number: "asc" } }],
  });

  let running = D(0);
  const entries = lines.map((l) => {
    running = running.add(l.debit).sub(l.credit);
    return {
      date: l.voucher.date.toISOString().slice(0, 10),
      number: l.voucher.number,
      type: l.voucher.type,
      particulars: l.narration ?? l.voucher.narration ?? "",
      debit: D(l.debit).toFixed(2),
      credit: D(l.credit).toFixed(2),
      balance: running.abs().toFixed(2),
      balanceType: running.gte(0) ? "DR" : "CR",
    };
  });

  return {
    ledger: { id: ledger.id, code: ledger.code, name: ledger.name },
    entries,
    closing: { amount: running.abs().toFixed(2), type: running.gte(0) ? "DR" : "CR" },
  };
}
