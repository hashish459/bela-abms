import { Prisma } from "@prisma/client";

/**
 * Purchase document totals engine — mirrors src/server/sales/calc.ts with one
 * difference: excise duty & custom duty are CAPITALIZED into the landed cost
 * (added to the line's base before the taxable/non-taxable split), matching
 * standard perpetual-inventory treatment — duty increases what stock is worth,
 * it is not a separate expense line.
 *
 *  landed amount = (qty × rate − line discount) + exciseDuty + customDuty
 *  header discount reduces the TAXABLE landed base only, apportioned pro-rata
 *  grand total = non-taxable total + taxable total + VAT
 */

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const r2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
const r4 = (d: Prisma.Decimal) => d.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

export type PurchaseCalcLineInput = {
  qty: Prisma.Decimal.Value;
  rate: Prisma.Decimal.Value;
  discount?: Prisma.Decimal.Value;
  exciseDuty?: Prisma.Decimal.Value;
  customDuty?: Prisma.Decimal.Value;
  taxRatePct?: Prisma.Decimal.Value;
  isNonTaxable?: boolean;
};

export type PurchaseCalcLineResult = {
  grossAmount: string; // qty × rate
  netAmount: string; // gross − line discount (goods price only, ex-duty)
  landedAmount: string; // net + exciseDuty + customDuty, BEFORE header discount (display only)
  capitalizedAmount: string; // landedAmount − this line's header-discount share — the amount
  // actually capitalized to Inventory / expensed. ALWAYS use this (not landedAmount) to
  // build GL debit lines — landedAmount alone is pre-discount and will throw the voucher
  // out of balance by the discount amount.
  landedUnitCost: string; // capitalizedAmount ÷ qty — feeds StockMovement.unitCost
  headerDiscountShare: string;
  taxableBase: string;
  lineVat: string;
  lineTotal: string;
};

export type PurchaseCalcResult = {
  lines: PurchaseCalcLineResult[];
  subtotal: string; // Σ net (goods price, ex-duty, ex-VAT)
  lineDiscountTotal: string;
  totalExciseDuty: string;
  totalCustomDuty: string;
  invoiceDiscount: string;
  nonTaxableTotal: string;
  taxableTotal: string;
  vatAmount: string;
  grandTotal: string;
};

export function calcPurchaseTotals(
  linesIn: PurchaseCalcLineInput[],
  invoiceDiscountIn: Prisma.Decimal.Value = 0,
): PurchaseCalcResult {
  type Work = {
    qty: Prisma.Decimal;
    gross: Prisma.Decimal;
    lineDiscount: Prisma.Decimal;
    excise: Prisma.Decimal;
    custom: Prisma.Decimal;
    net: Prisma.Decimal;
    landed: Prisma.Decimal; // net + excise + custom, before header discount
    ratePct: Prisma.Decimal;
    nonTaxable: boolean;
  };

  const work: Work[] = linesIn.map((l) => {
    const qty = D(l.qty);
    const rate = D(l.rate);
    const lineDiscount = r2(D(l.discount ?? 0));
    const excise = r2(D(l.exciseDuty ?? 0));
    const custom = r2(D(l.customDuty ?? 0));
    const ratePct = D(l.taxRatePct ?? 0);
    const nonTaxable = !!l.isNonTaxable || ratePct.lte(0);

    const gross = qty.mul(rate);
    const net = gross.sub(lineDiscount);
    const landed = net.add(excise).add(custom);
    return { qty, gross, lineDiscount, excise, custom, net: r4(net), landed: r4(landed), ratePct, nonTaxable };
  });

  const subtotal = work.reduce((a, w) => a.add(w.net), D(0));
  const lineDiscountTotal = work.reduce((a, w) => a.add(w.lineDiscount), D(0));
  const totalExciseDuty = work.reduce((a, w) => a.add(w.excise), D(0));
  const totalCustomDuty = work.reduce((a, w) => a.add(w.custom), D(0));
  const nonTaxableTotal = work.filter((w) => w.nonTaxable).reduce((a, w) => a.add(w.landed), D(0));
  const taxableSubtotal = work.filter((w) => !w.nonTaxable).reduce((a, w) => a.add(w.landed), D(0));

  const invoiceDiscount = Prisma.Decimal.min(
    Prisma.Decimal.max(D(invoiceDiscountIn), D(0)),
    Prisma.Decimal.max(taxableSubtotal, D(0)),
  );

  const lineResults: PurchaseCalcLineResult[] = [];
  let allocatedDiscount = D(0);
  let vatAmount = D(0);
  let taxableTotal = D(0);

  const taxableIdx = work.map((w, i) => (w.nonTaxable ? -1 : i)).filter((i) => i >= 0);

  work.forEach((w, i) => {
    let headerShare = D(0);
    let taxableBase = D(0);
    let lineVat = D(0);

    if (!w.nonTaxable) {
      const isLast = i === taxableIdx[taxableIdx.length - 1];
      if (isLast) {
        headerShare = invoiceDiscount.sub(allocatedDiscount);
      } else if (taxableSubtotal.gt(0)) {
        headerShare = r2(invoiceDiscount.mul(w.landed).div(taxableSubtotal));
      }
      allocatedDiscount = allocatedDiscount.add(headerShare);
      taxableBase = w.landed.sub(headerShare);
      lineVat = r2(taxableBase.mul(w.ratePct).div(100));
      taxableTotal = taxableTotal.add(taxableBase);
      vatAmount = vatAmount.add(lineVat);
    }

    const finalLanded = w.nonTaxable ? w.landed : taxableBase;
    const landedUnitCost = w.qty.gt(0) ? r4(finalLanded.div(w.qty)) : D(0);
    const lineTotal = finalLanded.add(lineVat);

    lineResults.push({
      grossAmount: r2(w.gross).toFixed(2),
      netAmount: r2(w.net).toFixed(2),
      landedAmount: r2(w.landed).toFixed(2),
      capitalizedAmount: r2(finalLanded).toFixed(2),
      landedUnitCost: landedUnitCost.toFixed(4),
      headerDiscountShare: r2(headerShare).toFixed(2),
      taxableBase: r2(taxableBase).toFixed(2),
      lineVat: r2(lineVat).toFixed(2),
      lineTotal: r2(lineTotal).toFixed(2),
    });
  });

  const grandTotal = r2(nonTaxableTotal).add(r2(taxableTotal)).add(r2(vatAmount));

  return {
    lines: lineResults,
    subtotal: r2(subtotal).toFixed(2),
    lineDiscountTotal: r2(lineDiscountTotal).toFixed(2),
    totalExciseDuty: r2(totalExciseDuty).toFixed(2),
    totalCustomDuty: r2(totalCustomDuty).toFixed(2),
    invoiceDiscount: r2(invoiceDiscount).toFixed(2),
    nonTaxableTotal: r2(nonTaxableTotal).toFixed(2),
    taxableTotal: r2(taxableTotal).toFixed(2),
    vatAmount: r2(vatAmount).toFixed(2),
    grandTotal: grandTotal.toFixed(2),
  };
}
