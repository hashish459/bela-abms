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

/* ───────────────────────────  Transaction List  ────────────────────────── */

/** Every posted GL line in a date range — the flattest, most granular report;
 * drills down to its source voucher (Docs key feature: "Zoom in from almost
 * all Reports to Source Voucher"). */
export async function transactionList(
  companyId: string,
  fiscalYearId: string,
  opts: { from: Date; to: Date; ledgerId?: string; page?: number; pageSize?: number },
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(200, opts.pageSize ?? 50);
  const where: Prisma.VoucherLineWhereInput = {
    voucher: { companyId, fiscalYearId, date: { gte: opts.from, lte: opts.to } },
    ...(opts.ledgerId ? { ledgerId: opts.ledgerId } : {}),
  };
  const [lines, total] = await Promise.all([
    db.voucherLine.findMany({
      where,
      orderBy: [{ voucher: { date: "asc" } }, { voucher: { number: "asc" } }, { order: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, debit: true, credit: true, narration: true,
        ledger: { select: { code: true, name: true } },
        voucher: { select: { id: true, number: true, date: true, type: true, narration: true } },
      },
    }),
    db.voucherLine.count({ where }),
  ]);
  return {
    rows: lines.map((l) => ({
      lineId: l.id,
      voucherId: l.voucher.id,
      voucherNumber: l.voucher.number,
      voucherType: l.voucher.type,
      date: l.voucher.date.toISOString().slice(0, 10),
      ledgerCode: l.ledger.code,
      ledgerName: l.ledger.name,
      debit: r2(D(l.debit)),
      credit: r2(D(l.credit)),
      narration: l.narration ?? l.voucher.narration ?? "",
    })),
    total,
    page,
    pageSize,
  };
}

/* ─────────────────────────  General Ledger Summary  ────────────────────── */

/** Per-ledger opening (movement before `from`) + period debit/credit +
 * closing, for a date range — distinct from Trial Balance, which is always
 * cumulative "as of" a single date from the ledger's inception. */
export async function generalLedgerSummary(
  companyId: string,
  fiscalYearId: string,
  opts: { from: Date; to: Date },
) {
  const ledgers = await db.ledger.findMany({
    where: { companyId, deletedAt: null },
    select: {
      id: true, code: true, name: true,
      accountGroup: { select: { name: true, accountHead: { select: { name: true, accountType: true } } } },
    },
    orderBy: { code: "asc" },
  });
  if (!ledgers.length) return { rows: [], totals: { openingDr: "0.00", debit: "0.00", credit: "0.00", closingDr: "0.00" } };

  const ids = ledgers.map((l) => l.id);
  const [opening, period] = await Promise.all([
    db.voucherLine.groupBy({
      by: ["ledgerId"],
      where: { ledgerId: { in: ids }, voucher: { companyId, fiscalYearId, date: { lt: opts.from } } },
      _sum: { debit: true, credit: true },
    }),
    db.voucherLine.groupBy({
      by: ["ledgerId"],
      where: { ledgerId: { in: ids }, voucher: { companyId, fiscalYearId, date: { gte: opts.from, lte: opts.to } } },
      _sum: { debit: true, credit: true },
    }),
  ]);
  const openById = new Map(opening.map((m) => [m.ledgerId, m._sum]));
  const periodById = new Map(period.map((m) => [m.ledgerId, m._sum]));

  const rows = ledgers
    .map((l) => {
      const o = openById.get(l.id);
      const p = periodById.get(l.id);
      const openingNet = D(o?.debit ?? 0).sub(o?.credit ?? 0);
      const dr = D(p?.debit ?? 0);
      const cr = D(p?.credit ?? 0);
      const closingNet = openingNet.add(dr).sub(cr);
      return {
        ledgerId: l.id,
        code: l.code,
        name: l.name,
        groupName: l.accountGroup.name,
        headName: l.accountGroup.accountHead.name,
        accountType: l.accountGroup.accountHead.accountType,
        opening: r2(openingNet.abs()),
        openingType: openingNet.gte(0) ? "DR" : "CR",
        debit: r2(dr),
        credit: r2(cr),
        closing: r2(closingNet.abs()),
        closingType: closingNet.gte(0) ? "DR" : "CR",
        _openingNet: openingNet,
        _closingNet: closingNet,
        _dr: dr,
        _cr: cr,
      };
    })
    .filter((r) => r.debit !== "0.00" || r.credit !== "0.00" || r.opening !== "0.00");

  const totals = rows.reduce(
    (a, r) => ({
      openingDr: a.openingDr.add(r._openingNet.gt(0) ? r._openingNet : 0),
      debit: a.debit.add(r._dr),
      credit: a.credit.add(r._cr),
      closingDr: a.closingDr.add(r._closingNet.gt(0) ? r._closingNet : 0),
    }),
    { openingDr: D(0), debit: D(0), credit: D(0), closingDr: D(0) },
  );

  return {
    rows: rows.map((r) => ({
      ledgerId: r.ledgerId, code: r.code, name: r.name, groupName: r.groupName, headName: r.headName,
      accountType: r.accountType, opening: r.opening, openingType: r.openingType,
      debit: r.debit, credit: r.credit, closing: r.closing, closingType: r.closingType,
    })),
    totals: {
      openingDr: r2(totals.openingDr),
      debit: r2(totals.debit),
      credit: r2(totals.credit),
      closingDr: r2(totals.closingDr),
    },
  };
}

/* ──────────────────────  Journal / Contra voucher report  ──────────────── */

/** Read-only report view of posted Journal/Contra vouchers in a date range —
 * gated by `reports.accounting_reports` rather than the Vouchers module, so
 * an auditor role can see this without voucher-entry rights. */
export async function voucherReport(
  companyId: string,
  fiscalYearId: string,
  type: "JOURNAL" | "CONTRA",
  opts: { from: Date; to: Date },
) {
  const vouchers = await db.voucher.findMany({
    where: { companyId, fiscalYearId, type, date: { gte: opts.from, lte: opts.to } },
    orderBy: [{ date: "asc" }, { number: "asc" }],
    include: { lines: { include: { ledger: { select: { code: true, name: true } } }, orderBy: { order: "asc" } } },
  });
  let total = D(0);
  const rows = vouchers.map((v) => {
    const amount = v.lines.reduce((a, l) => a.add(l.debit), D(0));
    total = total.add(amount);
    return {
      id: v.id,
      number: v.number,
      date: v.date.toISOString().slice(0, 10),
      narration: v.narration ?? "",
      amount: r2(amount),
      lines: v.lines.map((l) => ({
        ledgerCode: l.ledger.code,
        ledgerName: l.ledger.name,
        debit: r2(D(l.debit)),
        credit: r2(D(l.credit)),
        narration: l.narration ?? "",
      })),
    };
  });
  return { rows, totalAmount: r2(total) };
}

/* ──────────────────────────  Sales / Purchase report  ──────────────────── */

export async function salesReport(
  companyId: string,
  fiscalYearId: string,
  type: "INVOICE" | "CREDIT_NOTE",
  opts: { from: Date; to: Date },
) {
  const rows = await db.salesDoc.findMany({
    where: { companyId, fiscalYearId, type, date: { gte: opts.from, lte: opts.to } },
    orderBy: [{ date: "asc" }, { number: "asc" }],
    select: {
      id: true, number: true, date: true, customerName: true, customerPan: true,
      referenceNo: true, nonTaxableTotal: true, taxableTotal: true, vatAmount: true,
      grandTotal: true, amountPaid: true, status: true,
    },
  });
  const totals = rows.reduce(
    (a, r) => ({
      nonTaxable: a.nonTaxable.add(r.nonTaxableTotal),
      taxable: a.taxable.add(r.taxableTotal),
      vat: a.vat.add(r.vatAmount),
      grandTotal: a.grandTotal.add(r.grandTotal),
    }),
    { nonTaxable: D(0), taxable: D(0), vat: D(0), grandTotal: D(0) },
  );
  return {
    rows: rows.map((d) => ({
      id: d.id,
      number: d.number,
      date: d.date.toISOString().slice(0, 10),
      party: d.customerName ?? "—",
      pan: d.customerPan ?? "—",
      reference: d.referenceNo ?? "—",
      nonTaxable: r2(D(d.nonTaxableTotal)),
      taxable: r2(D(d.taxableTotal)),
      vat: r2(D(d.vatAmount)),
      grandTotal: r2(D(d.grandTotal)),
      outstanding: r2(D(d.grandTotal).sub(d.amountPaid)),
      status: d.status,
    })),
    totals: {
      nonTaxable: r2(totals.nonTaxable),
      taxable: r2(totals.taxable),
      vat: r2(totals.vat),
      grandTotal: r2(totals.grandTotal),
    },
  };
}

export async function purchaseReport(
  companyId: string,
  fiscalYearId: string,
  type: "INVOICE" | "DEBIT_NOTE",
  opts: { from: Date; to: Date },
) {
  const rows = await db.purchaseDoc.findMany({
    where: { companyId, fiscalYearId, type, date: { gte: opts.from, lte: opts.to } },
    orderBy: [{ date: "asc" }, { number: "asc" }],
    select: {
      id: true, number: true, date: true, supplierName: true, supplierPan: true,
      supplierInvoiceNumber: true, nonTaxableTotal: true, taxableTotal: true, vatAmount: true,
      grandTotal: true, amountPaid: true, status: true,
    },
  });
  const totals = rows.reduce(
    (a, r) => ({
      nonTaxable: a.nonTaxable.add(r.nonTaxableTotal),
      taxable: a.taxable.add(r.taxableTotal),
      vat: a.vat.add(r.vatAmount),
      grandTotal: a.grandTotal.add(r.grandTotal),
    }),
    { nonTaxable: D(0), taxable: D(0), vat: D(0), grandTotal: D(0) },
  );
  return {
    rows: rows.map((d) => ({
      id: d.id,
      number: d.number,
      date: d.date.toISOString().slice(0, 10),
      party: d.supplierName ?? "—",
      pan: d.supplierPan ?? "—",
      reference: d.supplierInvoiceNumber ?? "—",
      nonTaxable: r2(D(d.nonTaxableTotal)),
      taxable: r2(D(d.taxableTotal)),
      vat: r2(D(d.vatAmount)),
      grandTotal: r2(D(d.grandTotal)),
      outstanding: r2(D(d.grandTotal).sub(d.amountPaid)),
      status: d.status,
    })),
    totals: {
      nonTaxable: r2(totals.nonTaxable),
      taxable: r2(totals.taxable),
      vat: r2(totals.vat),
      grandTotal: r2(totals.grandTotal),
    },
  };
}

/* ─────────────────────────  Receipt / Payment report  ──────────────────── */

export async function receiptsReport(companyId: string, fiscalYearId: string, opts: { from: Date; to: Date }) {
  const rows = await db.receipt.findMany({
    where: { companyId, fiscalYearId, date: { gte: opts.from, lte: opts.to } },
    orderBy: [{ date: "asc" }, { number: "asc" }],
    select: {
      id: true, number: true, date: true, amount: true, paymentMode: true, reference: true,
      customerLedgerId: true, paymentLedgerId: true, againstDoc: { select: { number: true } },
    },
  });
  const ledgerIds = [...new Set(rows.flatMap((r) => [r.customerLedgerId, r.paymentLedgerId]))];
  const ledgers = ledgerIds.length
    ? await db.ledger.findMany({ where: { id: { in: ledgerIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(ledgers.map((l) => [l.id, l.name]));
  const total = rows.reduce((a, r) => a.add(r.amount), D(0));
  return {
    rows: rows.map((r) => ({
      id: r.id,
      number: r.number,
      date: r.date.toISOString().slice(0, 10),
      party: nameById.get(r.customerLedgerId) ?? "—",
      receivedIn: nameById.get(r.paymentLedgerId) ?? "—",
      against: r.againstDoc?.number ?? "On account",
      paymentMode: r.paymentMode,
      reference: r.reference ?? "—",
      amount: r2(D(r.amount)),
    })),
    totalAmount: r2(total),
  };
}

export async function paymentsReport(companyId: string, fiscalYearId: string, opts: { from: Date; to: Date }) {
  const rows = await db.supplierPayment.findMany({
    where: { companyId, fiscalYearId, date: { gte: opts.from, lte: opts.to } },
    orderBy: [{ date: "asc" }, { number: "asc" }],
    select: {
      id: true, number: true, date: true, amount: true, paymentMode: true, reference: true,
      supplierLedgerId: true, paymentLedgerId: true, againstDoc: { select: { number: true } },
    },
  });
  const ledgerIds = [...new Set(rows.flatMap((r) => [r.supplierLedgerId, r.paymentLedgerId]))];
  const ledgers = ledgerIds.length
    ? await db.ledger.findMany({ where: { id: { in: ledgerIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(ledgers.map((l) => [l.id, l.name]));
  const total = rows.reduce((a, r) => a.add(r.amount), D(0));
  return {
    rows: rows.map((r) => ({
      id: r.id,
      number: r.number,
      date: r.date.toISOString().slice(0, 10),
      party: nameById.get(r.supplierLedgerId) ?? "—",
      paidFrom: nameById.get(r.paymentLedgerId) ?? "—",
      against: r.againstDoc?.number ?? "On account",
      paymentMode: r.paymentMode,
      reference: r.reference ?? "—",
      amount: r2(D(r.amount)),
    })),
    totalAmount: r2(total),
  };
}

/* ──────────────────────────  Monthly Tax Summary  ───────────────────────── */

/** Output/Input VAT bucketed by calendar month across a range — the same
 * inputs as vatReturn(), grouped monthly instead of totalled for one period. */
export async function monthlyTaxSummary(companyId: string, fiscalYearId: string, opts: { from: Date; to: Date }) {
  const [sales, purchases] = await Promise.all([
    db.salesDoc.findMany({
      where: { companyId, fiscalYearId, type: { in: ["INVOICE", "CREDIT_NOTE"] }, date: { gte: opts.from, lte: opts.to } },
      select: { date: true, type: true, taxableTotal: true, nonTaxableTotal: true, vatAmount: true },
    }),
    db.purchaseDoc.findMany({
      where: { companyId, fiscalYearId, type: { in: ["INVOICE", "DEBIT_NOTE"] }, date: { gte: opts.from, lte: opts.to } },
      select: { date: true, type: true, taxableTotal: true, nonTaxableTotal: true, vatAmount: true },
    }),
  ]);

  type Bucket = { salesTaxable: Prisma.Decimal; salesVat: Prisma.Decimal; purchaseTaxable: Prisma.Decimal; purchaseVat: Prisma.Decimal };
  const byMonth = new Map<string, Bucket>();
  const get = (d: Date) => {
    const key = d.toISOString().slice(0, 7); // "YYYY-MM"
    if (!byMonth.has(key)) byMonth.set(key, { salesTaxable: D(0), salesVat: D(0), purchaseTaxable: D(0), purchaseVat: D(0) });
    return byMonth.get(key)!;
  };
  for (const s of sales) {
    const b = get(s.date);
    const sign = s.type === "CREDIT_NOTE" ? -1 : 1;
    b.salesTaxable = b.salesTaxable.add(D(s.taxableTotal).mul(sign));
    b.salesVat = b.salesVat.add(D(s.vatAmount).mul(sign));
  }
  for (const p of purchases) {
    const b = get(p.date);
    const sign = p.type === "DEBIT_NOTE" ? -1 : 1;
    b.purchaseTaxable = b.purchaseTaxable.add(D(p.taxableTotal).mul(sign));
    b.purchaseVat = b.purchaseVat.add(D(p.vatAmount).mul(sign));
  }

  const rows = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      salesTaxable: r2(b.salesTaxable),
      outputVat: r2(b.salesVat),
      purchaseTaxable: r2(b.purchaseTaxable),
      inputVat: r2(b.purchaseVat),
      netPayable: r2(b.salesVat.sub(b.purchaseVat)),
    }));
  return { rows };
}

/* ──────────────────────────────  Activity Log  ──────────────────────────── */

export async function activityLog(
  companyId: string,
  opts: { from?: Date; to?: Date; userId?: string; action?: string; page?: number; pageSize?: number },
) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, opts.pageSize ?? 30);
  const where: Prisma.AuditLogWhereInput = {
    companyId,
    ...(opts.from || opts.to ? { createdAt: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } } : {}),
    ...(opts.userId ? { userId: opts.userId } : {}),
    ...(opts.action ? { action: opts.action } : {}),
  };
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, action: true, entity: true, entityId: true, ip: true, createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    db.auditLog.count({ where }),
  ]);
  return {
    rows: rows.map((r) => ({
      id: r.id,
      at: r.createdAt.toISOString(),
      user: r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : "System",
      email: r.user?.email ?? "",
      action: r.action,
      entity: r.entity ?? "",
      entityId: r.entityId ?? "",
      ip: r.ip ?? "",
    })),
    total,
    page,
    pageSize,
  };
}

/* ────────────────────────────  Sales Profit  ────────────────────────────── */

/** Gross profit per invoice: ex-VAT sales value minus the COGS voucher
 * postVoucher() already writes at weighted-average cost (SalesDoc.cogsVoucherId) —
 * no separate cost calculation, just reads back what was posted at sale time. */
export async function salesProfitReport(companyId: string, fiscalYearId: string, opts: { from: Date; to: Date }) {
  const docs = await db.salesDoc.findMany({
    where: { companyId, fiscalYearId, type: "INVOICE", date: { gte: opts.from, lte: opts.to } },
    orderBy: [{ date: "asc" }, { number: "asc" }],
    select: { id: true, number: true, date: true, customerName: true, taxableTotal: true, nonTaxableTotal: true, cogsVoucherId: true },
  });
  const voucherIds = docs.map((d) => d.cogsVoucherId).filter((id): id is string => !!id);
  const cogsLines = voucherIds.length
    ? await db.voucherLine.groupBy({ by: ["voucherId"], where: { voucherId: { in: voucherIds }, debit: { gt: 0 } }, _sum: { debit: true } })
    : [];
  const cogsByVoucher = new Map(cogsLines.map((l) => [l.voucherId, D(l._sum.debit ?? 0)]));

  let totalSales = D(0);
  let totalCogs = D(0);
  const rows = docs.map((d) => {
    const sales = D(d.taxableTotal).add(d.nonTaxableTotal);
    const cogs = d.cogsVoucherId ? cogsByVoucher.get(d.cogsVoucherId) ?? D(0) : D(0);
    const profit = sales.sub(cogs);
    totalSales = totalSales.add(sales);
    totalCogs = totalCogs.add(cogs);
    return {
      id: d.id,
      number: d.number,
      date: d.date.toISOString().slice(0, 10),
      party: d.customerName ?? "—",
      sales: r2(sales),
      cogs: r2(cogs),
      profit: r2(profit),
      marginPct: sales.gt(0) ? profit.div(sales).mul(100).toDecimalPlaces(1).toFixed(1) : "0.0",
    };
  });

  const totalProfit = totalSales.sub(totalCogs);
  return {
    rows,
    totals: {
      sales: r2(totalSales),
      cogs: r2(totalCogs),
      profit: r2(totalProfit),
      marginPct: totalSales.gt(0) ? totalProfit.div(totalSales).mul(100).toDecimalPlaces(1).toFixed(1) : "0.0",
    },
  };
}
