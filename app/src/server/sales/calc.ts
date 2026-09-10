import { Prisma } from "@prisma/client";

/**
 * Sales/purchase document totals engine — the single authoritative calculation.
 * Pure & deterministic (see calc.test.ts). The client may preview with the same
 * logic, but the server value is what gets stored.
 *
 * Rules (Docs/WORKFLOWS.md W4, Docs/ASSUMPTIONS.md A3/A4):
 *  - line net (tax-exclusive base) = qty × rate − line discount
 *      · tax-inclusive line: rate already contains VAT → back it out
 *  - header discount reduces the TAXABLE base only, apportioned pro-rata across
 *    taxable lines by their net, and each line's VAT is recomputed on the reduced base
 *  - non-taxable lines are untouched by the header discount and carry no VAT
 *  - grand total = non-taxable total + taxable total + VAT
 */

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const r2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
const r4 = (d: Prisma.Decimal) => d.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

export type CalcLineInput = {
  qty: Prisma.Decimal.Value;
  rate: Prisma.Decimal.Value;
  discount?: Prisma.Decimal.Value; // absolute, per line
  taxRatePct?: Prisma.Decimal.Value; // e.g. 13
  isNonTaxable?: boolean;
  priceInclusive?: boolean;
};

export type CalcLineResult = {
  grossAmount: string; // qty × rate  (as entered — incl. tax if priceInclusive)
  netAmount: string; // tax-exclusive base after line discount, before header discount
  headerDiscountShare: string;
  taxableBase: string; // net − headerDiscountShare  (0 for non-taxable lines)
  lineVat: string;
  lineTotal: string; // taxableBase + lineVat  (+ net for non-taxable)
};

export type CalcResult = {
  lines: CalcLineResult[];
  subtotal: string; // Σ line net (tax-exclusive), before header discount
  lineDiscountTotal: string;
  invoiceDiscount: string; // clamped to the taxable base
  nonTaxableTotal: string;
  taxableTotal: string; // after header discount
  vatAmount: string;
  grandTotal: string;
};

export function calcSalesTotals(
  linesIn: CalcLineInput[],
  invoiceDiscountIn: Prisma.Decimal.Value = 0,
): CalcResult {
  type Work = {
    gross: Prisma.Decimal;
    lineDiscount: Prisma.Decimal;
    net: Prisma.Decimal; // tax-exclusive base after line discount
    ratePct: Prisma.Decimal;
    nonTaxable: boolean;
  };

  const work: Work[] = linesIn.map((l) => {
    const qty = D(l.qty);
    const rate = D(l.rate);
    const lineDiscount = r2(D(l.discount ?? 0));
    const ratePct = D(l.taxRatePct ?? 0);
    const nonTaxable = !!l.isNonTaxable || ratePct.lte(0);

    const gross = qty.mul(rate); // as entered
    const grossAfterDisc = gross.sub(lineDiscount);

    let net: Prisma.Decimal;
    if (l.priceInclusive && !nonTaxable) {
      // rate contains VAT → strip it out of the discounted amount
      net = grossAfterDisc.div(D(1).add(ratePct.div(100)));
    } else {
      net = grossAfterDisc;
    }
    return { gross, lineDiscount, net: r4(net), ratePct, nonTaxable };
  });

  const subtotal = work.reduce((a, w) => a.add(w.net), D(0));
  const lineDiscountTotal = work.reduce((a, w) => a.add(w.lineDiscount), D(0));
  const nonTaxableTotal = work
    .filter((w) => w.nonTaxable)
    .reduce((a, w) => a.add(w.net), D(0));
  const taxableSubtotal = work
    .filter((w) => !w.nonTaxable)
    .reduce((a, w) => a.add(w.net), D(0));

  // header discount can't exceed the taxable base
  const invoiceDiscount = Prisma.Decimal.min(
    Prisma.Decimal.max(D(invoiceDiscountIn), D(0)),
    Prisma.Decimal.max(taxableSubtotal, D(0)),
  );

  const lineResults: CalcLineResult[] = [];
  let allocatedDiscount = D(0);
  let vatAmount = D(0);
  let taxableTotal = D(0);

  const taxableIdx = work
    .map((w, i) => (w.nonTaxable ? -1 : i))
    .filter((i) => i >= 0);

  work.forEach((w, i) => {
    let headerShare = D(0);
    let taxableBase = D(0);
    let lineVat = D(0);

    if (!w.nonTaxable) {
      const isLastTaxable = i === taxableIdx[taxableIdx.length - 1];
      if (isLastTaxable) {
        headerShare = invoiceDiscount.sub(allocatedDiscount); // absorb rounding
      } else if (taxableSubtotal.gt(0)) {
        headerShare = r2(invoiceDiscount.mul(w.net).div(taxableSubtotal));
      }
      allocatedDiscount = allocatedDiscount.add(headerShare);
      taxableBase = w.net.sub(headerShare);
      lineVat = r2(taxableBase.mul(w.ratePct).div(100));
      taxableTotal = taxableTotal.add(taxableBase);
      vatAmount = vatAmount.add(lineVat);
    } else {
      taxableBase = D(0);
    }

    const lineTotal = w.nonTaxable ? w.net : taxableBase.add(lineVat);
    lineResults.push({
      grossAmount: r2(w.gross).toFixed(2),
      netAmount: r2(w.net).toFixed(2),
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
    invoiceDiscount: r2(invoiceDiscount).toFixed(2),
    nonTaxableTotal: r2(nonTaxableTotal).toFixed(2),
    taxableTotal: r2(taxableTotal).toFixed(2),
    vatAmount: r2(vatAmount).toFixed(2),
    grandTotal: grandTotal.toFixed(2),
  };
}
