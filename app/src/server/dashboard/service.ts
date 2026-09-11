import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const r2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2);

/** Net Sales for the fiscal year to date (Invoices minus Credit Notes). */
export async function salesSummary(companyId: string, fiscalYearId: string) {
  const agg = await db.salesDoc.groupBy({
    by: ["type"],
    where: { companyId, fiscalYearId, type: { in: ["INVOICE", "CREDIT_NOTE"] } },
    _sum: { grandTotal: true },
    _count: { _all: true },
  });
  const invoice = agg.find((a) => a.type === "INVOICE");
  const credit = agg.find((a) => a.type === "CREDIT_NOTE");
  return {
    netSales: r2(D(invoice?._sum.grandTotal ?? 0).sub(credit?._sum.grandTotal ?? 0)),
    invoiceCount: invoice?._count._all ?? 0,
  };
}

/** Net Purchases for the fiscal year to date (Invoices minus Debit Notes). */
export async function purchaseSummary(companyId: string, fiscalYearId: string) {
  const agg = await db.purchaseDoc.groupBy({
    by: ["type"],
    where: { companyId, fiscalYearId, type: { in: ["INVOICE", "DEBIT_NOTE"] } },
    _sum: { grandTotal: true },
    _count: { _all: true },
  });
  const invoice = agg.find((a) => a.type === "INVOICE");
  const debit = agg.find((a) => a.type === "DEBIT_NOTE");
  return {
    netPurchases: r2(D(invoice?._sum.grandTotal ?? 0).sub(debit?._sum.grandTotal ?? 0)),
    invoiceCount: invoice?._count._all ?? 0,
  };
}

/** Combined balance of every Cash & Cash Equivalents ledger (cash + bank), as of now. */
export async function cashAndBankBalance(companyId: string, fiscalYearId: string) {
  const ledgers = await db.ledger.findMany({
    where: { companyId, deletedAt: null, accountGroup: { accountHead: { code: "CCE" } } },
    select: { id: true },
  });
  if (!ledgers.length) return "0.00";
  const agg = await db.voucherLine.aggregate({
    where: { ledgerId: { in: ledgers.map((l) => l.id) }, voucher: { companyId, fiscalYearId } },
    _sum: { debit: true, credit: true },
  });
  return r2(D(agg._sum.debit ?? 0).sub(agg._sum.credit ?? 0));
}

/** Daily net sales for the trailing N days (Invoices minus Credit Notes), zero-filled. */
export async function salesTrend(companyId: string, fiscalYearId: string, days = 30) {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);

  const rows = await db.salesDoc.groupBy({
    by: ["date", "type"],
    where: { companyId, fiscalYearId, type: { in: ["INVOICE", "CREDIT_NOTE"] }, date: { gte: from, lte: to } },
    _sum: { grandTotal: true },
  });

  const byDate = new Map<string, Prisma.Decimal>();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10);
    const sign = r.type === "INVOICE" ? 1 : -1;
    byDate.set(key, (byDate.get(key) ?? D(0)).add(D(r._sum.grandTotal ?? 0).mul(sign)));
  }

  const points: { date: string; amount: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    points.push({ date: key, amount: Number(byDate.get(key) ?? 0) });
  }
  return points;
}

/** Products at or below their reorder point (GOODS only, reorder point set). */
export async function lowStockAlerts(companyId: string) {
  const products = await db.product.findMany({
    where: { companyId, deletedAt: null, kind: "GOODS", reorderPoint: { not: null } },
    select: { id: true, name: true, sku: true, reorderPoint: true, unit: { select: { shortName: true } } },
  });
  if (!products.length) return [];

  const movements = await db.stockMovement.groupBy({
    by: ["productId"],
    where: { companyId, productId: { in: products.map((p) => p.id) } },
    _sum: { qty: true },
  });
  const qtyById = new Map(movements.map((m) => [m.productId, D(m._sum.qty ?? 0)]));

  return products
    .map((p) => ({
      id: p.id, name: p.name, sku: p.sku,
      onHand: (qtyById.get(p.id) ?? D(0)).toString(),
      reorderPoint: p.reorderPoint!.toString(),
      unit: p.unit.shortName,
      below: (qtyById.get(p.id) ?? D(0)).lte(p.reorderPoint!),
    }))
    .filter((p) => p.below)
    .sort((a, b) => Number(a.onHand) - Number(b.onHand));
}
