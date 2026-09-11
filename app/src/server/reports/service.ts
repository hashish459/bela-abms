import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { trialBalance } from "@/server/accounts/gl";

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const r2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2);

// Same ledgers the Sales/Purchase posting services credit/debit for VAT — see
// src/server/sales/service.ts LEDGER.VAT_PAYABLE and src/server/purchase/service.ts
// LEDGER.VAT_RECEIVABLE. Kept in sync manually since neither module exports a constant.
const VAT_PAYABLE_CODE = "ONFC-C-07-0001"; // output VAT (credited on sales, debited back on credit notes)
const VAT_RECEIVABLE_CODE = "ONFA-C-06-0001"; // input VAT (debited on purchases, credited back on debit notes)

const dateWhere = (from?: Date, to?: Date) =>
  from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};

/* ────────────────────────────  Profit & Loss  ─────────────────────────── */

export type PLRow = {
  ledgerId: string;
  code: string;
  name: string;
  groupName: string;
  headCode: string;
  headName: string;
  amount: string; // always positive, natural side for Income/Expense
};

export async function profitAndLoss(
  companyId: string,
  fiscalYearId: string,
  opts: { from?: Date; to?: Date } = {},
) {
  const ledgers = await db.ledger.findMany({
    where: {
      companyId,
      deletedAt: null,
      accountGroup: { accountHead: { accountType: { in: ["IN", "EX"] } } },
    },
    select: {
      id: true,
      code: true,
      name: true,
      accountGroup: {
        select: { name: true, accountHead: { select: { code: true, name: true, accountType: true } } },
      },
    },
    orderBy: { code: "asc" },
  });

  const movements = ledgers.length
    ? await db.voucherLine.groupBy({
        by: ["ledgerId"],
        where: {
          ledgerId: { in: ledgers.map((l) => l.id) },
          voucher: { companyId, fiscalYearId, ...dateWhere(opts.from, opts.to) },
        },
        _sum: { debit: true, credit: true },
      })
    : [];
  const moveById = new Map(movements.map((m) => [m.ledgerId, m._sum]));

  const income: PLRow[] = [];
  const expense: PLRow[] = [];
  for (const l of ledgers) {
    const m = moveById.get(l.id);
    const dr = D(m?.debit ?? 0);
    const cr = D(m?.credit ?? 0);
    const type = l.accountGroup.accountHead.accountType;
    const net = type === "IN" ? cr.sub(dr) : dr.sub(cr);
    if (net.eq(0)) continue;
    const row: PLRow = {
      ledgerId: l.id,
      code: l.code,
      name: l.name,
      groupName: l.accountGroup.name,
      headCode: l.accountGroup.accountHead.code,
      headName: l.accountGroup.accountHead.name,
      amount: r2(net),
    };
    (type === "IN" ? income : expense).push(row);
  }

  const totalIncome = income.reduce((a, r) => a.add(r.amount), D(0));
  const totalExpense = expense.reduce((a, r) => a.add(r.amount), D(0));
  return {
    income,
    expense,
    totalIncome: r2(totalIncome),
    totalExpense: r2(totalExpense),
    netProfit: r2(totalIncome.sub(totalExpense)),
  };
}

/* ───────────────────────────── Balance Sheet ──────────────────────────── */

/**
 * Statement of Financial Position, as of a date. Assets vs Liabilities + Equity
 * + the period's not-yet-closed Profit/Loss (postVoucher's Σdebit=Σcredit
 * invariant guarantees Assets = Liabilities + Equity + NetProfit exactly, so
 * this always ties without any plug entry).
 */
export async function balanceSheet(
  companyId: string,
  fiscalYearId: string,
  opts: { asOf?: Date } = {},
) {
  const { rows } = await trialBalance(companyId, fiscalYearId, { asOf: opts.asOf });

  const side = (accountType: string, natural: "DR" | "CR") =>
    rows
      .filter((r) => r.accountType === accountType)
      .map((r) => ({
        ledgerId: r.ledgerId,
        code: r.code,
        name: r.name,
        groupName: r.groupName,
        headCode: r.headCode,
        headName: r.headName,
        amount: natural === "DR" ? r2(D(r.debit).sub(r.credit)) : r2(D(r.credit).sub(r.debit)),
      }));

  const assetRows = side("AS", "DR");
  const liabilityRows = side("LI", "CR");
  const equityRows = side("EQ", "CR");

  const pl = await profitAndLoss(companyId, fiscalYearId, { to: opts.asOf });

  const totalAssets = assetRows.reduce((a, r) => a.add(r.amount), D(0));
  const totalLiabilities = liabilityRows.reduce((a, r) => a.add(r.amount), D(0));
  const totalEquity = equityRows.reduce((a, r) => a.add(r.amount), D(0)).add(pl.netProfit);

  return {
    assets: assetRows,
    liabilities: liabilityRows,
    equity: equityRows,
    currentYearProfit: pl.netProfit,
    totals: {
      assets: r2(totalAssets),
      liabilities: r2(totalLiabilities),
      equity: r2(totalEquity),
      liabilitiesAndEquity: r2(totalLiabilities.add(totalEquity)),
    },
  };
}

/* ──────────────────────────────  Day Book  ────────────────────────────── */

export async function dayBook(companyId: string, fiscalYearId: string, opts: { from: Date; to: Date }) {
  const vouchers = await db.voucher.findMany({
    where: { companyId, fiscalYearId, date: { gte: opts.from, lte: opts.to } },
    include: {
      lines: { include: { ledger: { select: { code: true, name: true } } }, orderBy: { order: "asc" } },
    },
    orderBy: [{ date: "asc" }, { number: "asc" }],
  });

  let totalDr = D(0);
  let totalCr = D(0);
  const rows = vouchers.map((v) => {
    const lines = v.lines.map((l) => {
      totalDr = totalDr.add(l.debit);
      totalCr = totalCr.add(l.credit);
      return {
        ledgerCode: l.ledger.code,
        ledgerName: l.ledger.name,
        debit: D(l.debit).toFixed(2),
        credit: D(l.credit).toFixed(2),
        narration: l.narration ?? "",
      };
    });
    return {
      id: v.id,
      number: v.number,
      date: v.date.toISOString().slice(0, 10),
      type: v.type,
      narration: v.narration ?? "",
      lines,
    };
  });

  return { vouchers: rows, totals: { debit: r2(totalDr), credit: r2(totalCr) } };
}

/* ──────────────────────────────  VAT Return  ──────────────────────────── */

async function ledgerMovement(
  companyId: string,
  fiscalYearId: string,
  code: string,
  range: { from: Date; to: Date },
) {
  const ledger = await db.ledger.findFirst({ where: { companyId, code, deletedAt: null }, select: { id: true } });
  if (!ledger) return { debit: D(0), credit: D(0) };
  const agg = await db.voucherLine.aggregate({
    where: { ledgerId: ledger.id, voucher: { companyId, fiscalYearId, date: { gte: range.from, lte: range.to } } },
    _sum: { debit: true, credit: true },
  });
  return { debit: D(agg._sum.debit ?? 0), credit: D(agg._sum.credit ?? 0) };
}

type MoneyAgg = { taxableTotal: Prisma.Decimal | null; nonTaxableTotal: Prisma.Decimal | null; vatAmount: Prisma.Decimal | null };
const netMoney = (inv?: MoneyAgg, ret?: MoneyAgg) => ({
  taxable: r2(D(inv?.taxableTotal ?? 0).sub(ret?.taxableTotal ?? 0)),
  nonTaxable: r2(D(inv?.nonTaxableTotal ?? 0).sub(ret?.nonTaxableTotal ?? 0)),
  vat: r2(D(inv?.vatAmount ?? 0).sub(ret?.vatAmount ?? 0)),
});

/** Output VAT (from Sales, net of Credit Notes) vs Input VAT (from Purchase, net of Debit Notes). */
export async function vatReturn(companyId: string, fiscalYearId: string, opts: { from: Date; to: Date }) {
  const [vatPayable, vatReceivable] = await Promise.all([
    ledgerMovement(companyId, fiscalYearId, VAT_PAYABLE_CODE, opts),
    ledgerMovement(companyId, fiscalYearId, VAT_RECEIVABLE_CODE, opts),
  ]);
  const outputVat = vatPayable.credit.sub(vatPayable.debit);
  const inputVat = vatReceivable.debit.sub(vatReceivable.credit);

  const [salesAgg, purchaseAgg] = await Promise.all([
    db.salesDoc.groupBy({
      by: ["type"],
      where: { companyId, fiscalYearId, type: { in: ["INVOICE", "CREDIT_NOTE"] }, date: { gte: opts.from, lte: opts.to } },
      _sum: { taxableTotal: true, nonTaxableTotal: true, vatAmount: true },
    }),
    db.purchaseDoc.groupBy({
      by: ["type"],
      where: { companyId, fiscalYearId, type: { in: ["INVOICE", "DEBIT_NOTE"] }, date: { gte: opts.from, lte: opts.to } },
      _sum: { taxableTotal: true, nonTaxableTotal: true, vatAmount: true },
    }),
  ]);

  return {
    sales: netMoney(
      salesAgg.find((a) => a.type === "INVOICE")?._sum,
      salesAgg.find((a) => a.type === "CREDIT_NOTE")?._sum,
    ),
    purchase: netMoney(
      purchaseAgg.find((a) => a.type === "INVOICE")?._sum,
      purchaseAgg.find((a) => a.type === "DEBIT_NOTE")?._sum,
    ),
    outputVat: r2(outputVat),
    inputVat: r2(inputVat),
    // positive = payable to IRD, negative = refundable / carried forward
    netPayable: r2(outputVat.sub(inputVat)),
  };
}

/* ───────────────────────────────  Aging  ──────────────────────────────── */

export type AgingRow = {
  partyId: string;
  partyName: string;
  current: string; // 0-30 days
  d31to60: string;
  d61to90: string;
  over90: string;
  total: string;
};

function bucketAging(items: { partyId: string; partyName: string; date: Date; outstanding: Prisma.Decimal }[], asOf: Date) {
  const byParty = new Map<string, { partyName: string; current: Prisma.Decimal; d31to60: Prisma.Decimal; d61to90: Prisma.Decimal; over90: Prisma.Decimal }>();
  for (const it of items) {
    if (it.outstanding.lte(0.01)) continue;
    const days = Math.floor((asOf.getTime() - it.date.getTime()) / 86_400_000);
    if (!byParty.has(it.partyId))
      byParty.set(it.partyId, { partyName: it.partyName, current: D(0), d31to60: D(0), d61to90: D(0), over90: D(0) });
    const bucket = byParty.get(it.partyId)!;
    if (days <= 30) bucket.current = bucket.current.add(it.outstanding);
    else if (days <= 60) bucket.d31to60 = bucket.d31to60.add(it.outstanding);
    else if (days <= 90) bucket.d61to90 = bucket.d61to90.add(it.outstanding);
    else bucket.over90 = bucket.over90.add(it.outstanding);
  }

  const rows: AgingRow[] = [...byParty.entries()]
    .map(([partyId, b]) => ({
      partyId,
      partyName: b.partyName,
      current: r2(b.current),
      d31to60: r2(b.d31to60),
      d61to90: r2(b.d61to90),
      over90: r2(b.over90),
      total: r2(b.current.add(b.d31to60).add(b.d61to90).add(b.over90)),
    }))
    .sort((a, b) => Number(b.total) - Number(a.total));

  const sum = (key: keyof AgingRow) => r2(rows.reduce((a, r) => a.add(r[key] as string), D(0)));
  return {
    rows,
    totals: { current: sum("current"), d31to60: sum("d31to60"), d61to90: sum("d61to90"), over90: sum("over90"), total: sum("total") },
  };
}

/**
 * Receivables aging (unpaid Sales Invoices, net of Credit Notes against them —
 * SalesDoc.amountPaid/grandTotal are NOT adjusted by a credit note, only
 * `status`, so outstanding must subtract credited amounts here explicitly).
 */
export async function receivablesAging(companyId: string, opts: { asOf?: Date } = {}) {
  const asOf = opts.asOf ?? new Date();
  const invoices = await db.salesDoc.findMany({
    where: { companyId, type: "INVOICE" },
    select: { id: true, date: true, grandTotal: true, amountPaid: true, customerLedgerId: true, customerName: true },
  });
  if (!invoices.length) return bucketAging([], asOf);

  const credits = await db.salesDoc.groupBy({
    by: ["reversesDocId"],
    where: { companyId, type: "CREDIT_NOTE", reversesDocId: { in: invoices.map((i) => i.id) } },
    _sum: { grandTotal: true },
  });
  const creditedById = new Map(credits.map((c) => [c.reversesDocId!, D(c._sum.grandTotal ?? 0)]));

  return bucketAging(
    invoices.map((inv) => ({
      partyId: inv.customerLedgerId ?? `walkin:${inv.customerName ?? inv.id}`,
      partyName: inv.customerName ?? "Cash sale",
      date: inv.date,
      outstanding: D(inv.grandTotal).sub(inv.amountPaid).sub(creditedById.get(inv.id) ?? 0),
    })),
    asOf,
  );
}

/** Payables aging (unpaid Purchase Invoices, net of Debit Notes against them). */
export async function payablesAging(companyId: string, opts: { asOf?: Date } = {}) {
  const asOf = opts.asOf ?? new Date();
  const invoices = await db.purchaseDoc.findMany({
    where: { companyId, type: "INVOICE" },
    select: { id: true, date: true, grandTotal: true, amountPaid: true, supplierLedgerId: true, supplierName: true },
  });
  if (!invoices.length) return bucketAging([], asOf);

  const debits = await db.purchaseDoc.groupBy({
    by: ["reversesDocId"],
    where: { companyId, type: "DEBIT_NOTE", reversesDocId: { in: invoices.map((i) => i.id) } },
    _sum: { grandTotal: true },
  });
  const debitedById = new Map(debits.map((d) => [d.reversesDocId!, D(d._sum.grandTotal ?? 0)]));

  return bucketAging(
    invoices.map((inv) => ({
      partyId: inv.supplierLedgerId ?? `walkin:${inv.supplierName ?? inv.id}`,
      partyName: inv.supplierName ?? "Cash purchase",
      date: inv.date,
      outstanding: D(inv.grandTotal).sub(inv.amountPaid).sub(debitedById.get(inv.id) ?? 0),
    })),
    asOf,
  );
}
