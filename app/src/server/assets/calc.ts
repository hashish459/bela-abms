import { Prisma } from "@prisma/client";

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const r2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

/** Whole completed calendar months between two dates (never negative). */
export function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

export type DepreciationInput = {
  method: "STRAIGHT_LINE" | "WRITTEN_DOWN_VALUE";
  acquisitionCost: Prisma.Decimal.Value;
  salvageValue: Prisma.Decimal.Value;
  usefulLifeMonths: number | null;
  depreciationRatePct: Prisma.Decimal.Value | null;
  accumulatedSoFar: Prisma.Decimal.Value;
  months: number;
};

/**
 * Depreciation charge for a whole number of elapsed months, capped so the asset never
 * depreciates below its salvage value. Returns "0.00" if fully depreciated or months <= 0.
 */
export function calcDepreciation(input: DepreciationInput): string {
  const cost = D(input.acquisitionCost);
  const salvage = D(input.salvageValue);
  const accumSoFar = D(input.accumulatedSoFar);
  const bookValue = cost.sub(accumSoFar);
  const depreciableBase = cost.sub(salvage);

  if (input.months <= 0 || bookValue.lte(salvage) || depreciableBase.lte(0)) return "0.00";

  let amount: Prisma.Decimal;
  if (input.method === "STRAIGHT_LINE") {
    const monthly = input.usefulLifeMonths ? depreciableBase.div(input.usefulLifeMonths) : D(0);
    amount = monthly.mul(input.months);
  } else {
    const annualRate = D(input.depreciationRatePct ?? 0).div(100);
    amount = bookValue.mul(annualRate).mul(input.months).div(12);
  }

  // never depreciate past salvage value
  amount = Prisma.Decimal.min(amount, bookValue.sub(salvage));
  return r2(amount).toFixed(2);
}
