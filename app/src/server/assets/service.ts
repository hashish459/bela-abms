import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { errors } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { postVoucher, nextNumber } from "@/server/accounts/gl";
import { CATEGORY_LEDGER, DISPOSAL_LEDGER } from "./ledgers";
import { monthsBetween, calcDepreciation } from "./calc";
import type { FixedAssetCreate, DepreciationRunCreate, DisposeAssetCreate } from "./schemas";

type Tx = Prisma.TransactionClient;
const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const r2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
const orNull = (v?: string) => (v && v.length ? v : null);

async function ledgerId(tx: Tx, companyId: string, code: string): Promise<string> {
  const l = await tx.ledger.findFirst({ where: { companyId, code, deletedAt: null }, select: { id: true } });
  if (!l) throw errors.validation(null, `System account ${code} is missing — re-run the seed`);
  return l.id;
}

/* ──────────────────────────────  Create  ──────────────────────────────── */

export async function createFixedAsset(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: FixedAssetCreate,
) {
  return db.$transaction(async (tx) => {
    const map = CATEGORY_LEDGER[input.category];
    const assetLedgerId = await ledgerId(tx, companyId, map.asset);

    let creditLedgerId: string;
    if (input.paymentMode === "CREDIT") {
      const supplier = await tx.ledger.findFirst({
        where: { id: input.supplierLedgerId, companyId, deletedAt: null },
        select: { id: true },
      });
      if (!supplier) throw errors.validation(null, "Supplier not found");
      creditLedgerId = supplier.id;
    } else {
      const pay = await tx.ledger.findFirst({
        where: { id: input.paymentLedgerId, companyId, deletedAt: null },
        select: { id: true },
      });
      if (!pay) throw errors.validation(null, "Payment account not found");
      creditLedgerId = pay.id;
    }

    const seq = await nextNumber(tx, companyId, "none", "asset");
    const assetCode = `FA-${String(seq).padStart(5, "0")}`;
    const cost = r2(D(input.acquisitionCost));

    const asset = await tx.fixedAsset.create({
      data: {
        companyId,
        fiscalYearId,
        assetCode,
        name: input.name,
        category: input.category,
        serialNumber: orNull(input.serialNumber),
        location: orNull(input.location),
        notes: orNull(input.notes),
        acquisitionDate: new Date(input.acquisitionDate),
        acquisitionCost: cost,
        salvageValue: r2(D(input.salvageValue ?? 0)),
        depreciationMethod: input.depreciationMethod,
        usefulLifeMonths: input.category === "LAND" ? null : (input.usefulLifeMonths ?? null),
        depreciationRatePct:
          input.category === "LAND" || input.depreciationRatePct == null
            ? null
            : D(input.depreciationRatePct),
        paymentMode: input.paymentMode,
        paymentLedgerId: input.paymentMode === "CREDIT" ? null : orNull(input.paymentLedgerId),
        supplierLedgerId: input.paymentMode === "CREDIT" ? orNull(input.supplierLedgerId) : null,
        createdById: actorId,
      },
    });

    const v = await postVoucher(tx, {
      companyId,
      fiscalYearId,
      date: new Date(input.acquisitionDate),
      type: "ASSET",
      narration: `Acquisition of ${input.name} (${assetCode})`,
      sourceType: "FixedAsset",
      sourceId: asset.id,
      createdById: actorId,
      lines: [
        { ledgerId: assetLedgerId, debit: cost.toFixed(2), narration: input.name },
        { ledgerId: creditLedgerId, credit: cost.toFixed(2), narration: assetCode },
      ],
    });

    await tx.fixedAsset.update({ where: { id: asset.id }, data: { voucherId: v.id } });

    await writeAudit({
      userId: actorId, companyId, action: "CREATE", entity: "FixedAsset", entityId: asset.id,
      meta: { assetCode, name: input.name, cost: cost.toFixed(2) },
    });

    return { id: asset.id, assetCode };
  });
}

/* ───────────────────────────  Depreciation  ───────────────────────────── */

async function computeDueDepreciation(
  tx: Tx,
  companyId: string,
  asOf: Date,
  assetIds?: string[],
) {
  const assets = await tx.fixedAsset.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      category: { not: "LAND" },
      ...(assetIds?.length ? { id: { in: assetIds } } : {}),
    },
    select: {
      id: true, category: true, acquisitionDate: true, acquisitionCost: true, salvageValue: true,
      depreciationMethod: true, usefulLifeMonths: true, depreciationRatePct: true,
      depreciationEntries: { select: { amount: true, periodEnd: true }, orderBy: { periodEnd: "desc" } },
    },
  });

  const due: {
    assetId: string; category: string; ledgerCodes: { accumDep: string; depExpense: string };
    periodStart: Date; periodEnd: Date; amount: Prisma.Decimal;
  }[] = [];

  for (const a of assets) {
    const map = CATEGORY_LEDGER[a.category];
    if (!map.accumDep || !map.depExpense) continue; // safety net alongside the category filter above

    const accumSoFar = a.depreciationEntries.reduce((sum, e) => sum.add(e.amount), D(0));
    const lastTo = a.depreciationEntries[0]?.periodEnd ?? a.acquisitionDate;
    const months = monthsBetween(lastTo, asOf);

    const amount = D(calcDepreciation({
      method: a.depreciationMethod,
      acquisitionCost: a.acquisitionCost,
      salvageValue: a.salvageValue,
      usefulLifeMonths: a.usefulLifeMonths,
      depreciationRatePct: a.depreciationRatePct,
      accumulatedSoFar: accumSoFar,
      months,
    }));
    if (amount.lte(0)) continue;

    due.push({
      assetId: a.id, category: a.category, ledgerCodes: { accumDep: map.accumDep, depExpense: map.depExpense },
      periodStart: lastTo, periodEnd: asOf, amount,
    });
  }
  return due;
}

/**
 * Post depreciation for every due asset (or a specific list) as of a date. One voucher for
 * the whole run, lines grouped per category (Dr Depreciation Expense / Cr Accum. Depreciation),
 * plus one AssetDepreciationEntry per asset — the subsidiary detail the register reads from.
 */
export async function runDepreciation(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  input: DepreciationRunCreate,
) {
  return db.$transaction(async (tx) => {
    const asOf = new Date(input.asOfDate);
    const due = await computeDueDepreciation(tx, companyId, asOf, input.assetIds);
    if (!due.length) throw errors.validation(null, "No assets are due for depreciation as of this date");

    const byCategory = new Map<string, { accumDep: string; depExpense: string; total: Prisma.Decimal }>();
    for (const d of due) {
      const cur = byCategory.get(d.category) ?? { ...d.ledgerCodes, total: D(0) };
      cur.total = cur.total.add(d.amount);
      byCategory.set(d.category, cur);
    }

    const lines: { ledgerId: string; debit?: string; credit?: string; narration?: string }[] = [];
    for (const [category, g] of byCategory) {
      const depExpenseId = await ledgerId(tx, companyId, g.depExpense);
      const accumDepId = await ledgerId(tx, companyId, g.accumDep);
      lines.push({ ledgerId: depExpenseId, debit: g.total.toFixed(2), narration: category });
      lines.push({ ledgerId: accumDepId, credit: g.total.toFixed(2), narration: category });
    }

    const totalAmount = due.reduce((s, d) => s.add(d.amount), D(0));

    const v = await postVoucher(tx, {
      companyId, fiscalYearId, date: asOf, type: "DEPRECIATION",
      narration: `Depreciation run as of ${input.asOfDate} (${due.length} asset(s))`,
      sourceType: "DepreciationRun", createdById: actorId, lines,
    });

    const run = await tx.depreciationRun.create({
      data: {
        companyId, fiscalYearId, asOfDate: asOf, assetCount: due.length,
        totalAmount: r2(totalAmount), voucherId: v.id, createdById: actorId,
      },
    });

    await tx.assetDepreciationEntry.createMany({
      data: due.map((d) => ({
        assetId: d.assetId, runId: run.id, periodStart: d.periodStart, periodEnd: d.periodEnd,
        amount: d.amount,
      })),
    });

    await writeAudit({
      userId: actorId, companyId, action: "CREATE", entity: "DepreciationRun", entityId: run.id,
      meta: { assetCount: due.length, totalAmount: r2(totalAmount).toFixed(2) },
    });

    return { id: run.id, assetCount: due.length, totalAmount: r2(totalAmount).toFixed(2) };
  });
}

export async function listDepreciationRuns(companyId: string, fiscalYearId: string | null) {
  const runs = await db.depreciationRun.findMany({
    where: { companyId, ...(fiscalYearId ? { fiscalYearId } : {}) },
    orderBy: { asOfDate: "desc" },
    select: { id: true, asOfDate: true, assetCount: true, totalAmount: true, createdAt: true },
  });
  return runs.map((r) => ({
    id: r.id, asOfDate: r.asOfDate.toISOString().slice(0, 10),
    assetCount: r.assetCount, totalAmount: r.totalAmount.toFixed(2),
  }));
}

/* ─────────────────────────────  Disposal  ──────────────────────────────── */

export async function disposeAsset(
  companyId: string,
  fiscalYearId: string,
  actorId: string,
  assetId: string,
  input: DisposeAssetCreate,
) {
  return db.$transaction(async (tx) => {
    const asset = await tx.fixedAsset.findFirst({
      where: { id: assetId, companyId },
      include: { depreciationEntries: { select: { amount: true, periodEnd: true }, orderBy: { periodEnd: "desc" } } },
    });
    if (!asset) throw errors.notFound("Asset not found");
    if (asset.status === "DISPOSED") throw errors.conflict("Asset is already disposed");

    const disposalDate = new Date(input.disposalDate);
    const map = CATEGORY_LEDGER[asset.category];

    // Catch up depreciation for the partial period up to the disposal date, if any is due
    // and the category depreciates at all (Land never does).
    let accumDep = asset.depreciationEntries.reduce((s, e) => s.add(e.amount), D(0));
    if (map.accumDep && map.depExpense) {
      const due = await computeDueDepreciation(tx, companyId, disposalDate, [assetId]);
      if (due.length) {
        const d = due[0];
        const depExpenseId = await ledgerId(tx, companyId, map.depExpense);
        const accumDepId = await ledgerId(tx, companyId, map.accumDep);
        const catchUpVoucher = await postVoucher(tx, {
          companyId, fiscalYearId, date: disposalDate, type: "DEPRECIATION",
          narration: `Final depreciation for ${asset.name} (${asset.assetCode}) before disposal`,
          sourceType: "FixedAsset:final-depreciation", sourceId: assetId, createdById: actorId,
          lines: [
            { ledgerId: depExpenseId, debit: d.amount.toFixed(2) },
            { ledgerId: accumDepId, credit: d.amount.toFixed(2) },
          ],
        });
        const run = await tx.depreciationRun.create({
          data: {
            companyId, fiscalYearId, asOfDate: disposalDate, assetCount: 1,
            totalAmount: d.amount, voucherId: catchUpVoucher.id, createdById: actorId,
          },
        });
        await tx.assetDepreciationEntry.create({
          data: { assetId, runId: run.id, periodStart: d.periodStart, periodEnd: d.periodEnd, amount: d.amount },
        });
        accumDep = accumDep.add(d.amount);
      }
    }

    const bookValue = D(asset.acquisitionCost).sub(accumDep);
    const proceeds = r2(D(input.proceeds ?? 0));
    const diff = proceeds.sub(bookValue); // positive = gain, negative = loss

    const lines: { ledgerId: string; debit?: string; credit?: string; narration?: string }[] = [];
    const assetLedgerId = await ledgerId(tx, companyId, map.asset);
    if (map.accumDep && accumDep.gt(0)) {
      lines.push({ ledgerId: await ledgerId(tx, companyId, map.accumDep), debit: accumDep.toFixed(2) });
    }
    if (proceeds.gt(0)) {
      const recvLedger = await tx.ledger.findFirst({
        where: { id: input.disposalLedgerId, companyId, deletedAt: null },
        select: { id: true },
      });
      if (!recvLedger) throw errors.validation(null, "Disposal proceeds account not found");
      lines.push({ ledgerId: recvLedger.id, debit: proceeds.toFixed(2), narration: "Disposal proceeds" });
    }
    if (diff.lt(0)) {
      lines.push({ ledgerId: await ledgerId(tx, companyId, DISPOSAL_LEDGER.LOSS), debit: diff.abs().toFixed(2) });
    }
    lines.push({ ledgerId: assetLedgerId, credit: D(asset.acquisitionCost).toFixed(2), narration: asset.assetCode });
    if (diff.gt(0)) {
      lines.push({ ledgerId: await ledgerId(tx, companyId, DISPOSAL_LEDGER.GAIN), credit: diff.toFixed(2) });
    }

    const v = await postVoucher(tx, {
      companyId, fiscalYearId, date: disposalDate, type: "ASSET_DISPOSAL",
      narration: `Disposal of ${asset.name} (${asset.assetCode}) — ${input.disposalType}`,
      sourceType: "FixedAsset:disposal", sourceId: assetId, createdById: actorId, lines,
    });

    await tx.fixedAsset.update({
      where: { id: assetId },
      data: {
        status: "DISPOSED",
        disposalDate,
        disposalType: input.disposalType,
        disposalProceeds: proceeds,
        disposalLedgerId: proceeds.gt(0) ? orNull(input.disposalLedgerId) : null,
        disposalVoucherId: v.id,
        notes: input.notes ? `${asset.notes ? asset.notes + " — " : ""}${input.notes}` : asset.notes,
      },
    });

    await writeAudit({
      userId: actorId, companyId, action: "UPDATE", entity: "FixedAsset", entityId: assetId,
      meta: { disposalType: input.disposalType, proceeds: proceeds.toFixed(2), gainLoss: diff.toFixed(2) },
    });

    return { id: assetId, bookValue: bookValue.toFixed(2), gainLoss: diff.toFixed(2) };
  });
}

/* ──────────────────────────────  Reads  ────────────────────────────────── */

export async function listFixedAssets(companyId: string, opts: { status?: "ACTIVE" | "DISPOSED"; category?: string } = {}) {
  const assets = await db.fixedAsset.findMany({
    where: {
      companyId,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.category ? { category: opts.category as never } : {}),
    },
    orderBy: { assetCode: "asc" },
    include: { depreciationEntries: { select: { amount: true } } },
  });

  return assets.map((a) => {
    const accumDep = a.depreciationEntries.reduce((s, e) => s.add(e.amount), D(0));
    const bookValue = D(a.acquisitionCost).sub(accumDep);
    return {
      id: a.id, assetCode: a.assetCode, name: a.name, category: a.category,
      status: a.status, acquisitionDate: a.acquisitionDate.toISOString().slice(0, 10),
      acquisitionCost: a.acquisitionCost.toFixed(2),
      accumulatedDepreciation: r2(accumDep).toFixed(2),
      bookValue: r2(bookValue).toFixed(2),
      depreciationMethod: a.depreciationMethod,
      disposalType: a.disposalType,
      disposalDate: a.disposalDate?.toISOString().slice(0, 10) ?? null,
    };
  });
}

export async function getFixedAsset(companyId: string, id: string) {
  const asset = await db.fixedAsset.findFirst({
    where: { id, companyId },
    include: {
      depreciationEntries: {
        orderBy: { periodEnd: "asc" },
        select: { id: true, periodStart: true, periodEnd: true, amount: true },
      },
    },
  });
  if (!asset) throw errors.notFound("Asset not found");

  const accumDep = asset.depreciationEntries.reduce((s, e) => s.add(e.amount), D(0));
  const bookValue = D(asset.acquisitionCost).sub(accumDep);

  return {
    id: asset.id, assetCode: asset.assetCode, name: asset.name, category: asset.category,
    serialNumber: asset.serialNumber, location: asset.location, notes: asset.notes,
    status: asset.status,
    acquisitionDate: asset.acquisitionDate.toISOString().slice(0, 10),
    acquisitionCost: asset.acquisitionCost.toFixed(2),
    salvageValue: asset.salvageValue.toFixed(2),
    depreciationMethod: asset.depreciationMethod,
    usefulLifeMonths: asset.usefulLifeMonths,
    depreciationRatePct: asset.depreciationRatePct?.toFixed(4) ?? null,
    accumulatedDepreciation: r2(accumDep).toFixed(2),
    bookValue: r2(bookValue).toFixed(2),
    disposalDate: asset.disposalDate?.toISOString().slice(0, 10) ?? null,
    disposalType: asset.disposalType,
    disposalProceeds: asset.disposalProceeds?.toFixed(2) ?? null,
    entries: asset.depreciationEntries.map((e) => ({
      id: e.id,
      periodStart: e.periodStart.toISOString().slice(0, 10),
      periodEnd: e.periodEnd.toISOString().slice(0, 10),
      amount: e.amount.toFixed(2),
    })),
  };
}
