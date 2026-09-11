import { describe, it, expect } from "vitest";
import { monthsBetween, calcDepreciation } from "./calc";

describe("monthsBetween", () => {
  it("counts whole completed months", () => {
    expect(monthsBetween(new Date("2026-01-15"), new Date("2026-04-15"))).toBe(3);
  });

  it("does not count a partial month (day-of-month not yet reached)", () => {
    expect(monthsBetween(new Date("2026-01-15"), new Date("2026-04-10"))).toBe(2);
  });

  it("returns 0 for the same date", () => {
    expect(monthsBetween(new Date("2026-01-15"), new Date("2026-01-15"))).toBe(0);
  });

  it("never returns negative (clamped to 0) if `to` is before `from`", () => {
    expect(monthsBetween(new Date("2026-06-01"), new Date("2026-01-01"))).toBe(0);
  });

  it("handles a year boundary", () => {
    expect(monthsBetween(new Date("2025-11-01"), new Date("2026-02-01"))).toBe(3);
  });
});

describe("calcDepreciation — STRAIGHT_LINE", () => {
  const base = {
    method: "STRAIGHT_LINE" as const,
    acquisitionCost: 120000,
    salvageValue: 12000,
    usefulLifeMonths: 60, // Rs. 1800/month
    depreciationRatePct: null,
    accumulatedSoFar: 0,
  };

  it("charges monthly depreciable base × elapsed months", () => {
    expect(calcDepreciation({ ...base, months: 3 })).toBe("5400.00"); // 1800 * 3
  });

  it("returns 0.00 for zero elapsed months", () => {
    expect(calcDepreciation({ ...base, months: 0 })).toBe("0.00");
  });

  it("caps the charge so book value never drops below salvage value", () => {
    // 108000 depreciable / 1800 per month = 60 months to fully depreciate; asking for 100
    // months worth in one run must still only release the remaining depreciable base.
    expect(calcDepreciation({ ...base, months: 100 })).toBe("108000.00");
  });

  it("returns 0.00 once already fully depreciated", () => {
    expect(calcDepreciation({ ...base, accumulatedSoFar: 108000, months: 6 })).toBe("0.00");
  });
});

describe("calcDepreciation — WRITTEN_DOWN_VALUE", () => {
  const base = {
    method: "WRITTEN_DOWN_VALUE" as const,
    acquisitionCost: 100000,
    salvageValue: 0,
    usefulLifeMonths: null,
    depreciationRatePct: 20, // 20% per year on the reducing balance
  };

  it("charges rate × current book value, prorated for elapsed months", () => {
    // 12 months at 20% of a 100000 book value = 20000
    expect(calcDepreciation({ ...base, accumulatedSoFar: 0, months: 12 })).toBe("20000.00");
  });

  it("uses the REDUCED book value once some depreciation has already posted", () => {
    // book value = 100000 - 20000 = 80000; another 12 months at 20% = 16000
    expect(calcDepreciation({ ...base, accumulatedSoFar: 20000, months: 12 })).toBe("16000.00");
  });

  it("prorates for a partial year", () => {
    // 6 months at 20% of 100000 = 10000 * (6/12) = 10000
    expect(calcDepreciation({ ...base, accumulatedSoFar: 0, months: 6 })).toBe("10000.00");
  });

  it("caps the charge at the remaining book value above salvage", () => {
    expect(
      calcDepreciation({ ...base, salvageValue: 5000, accumulatedSoFar: 94500, months: 12 }),
    ).toBe("500.00"); // book value is 5500; 20% of that would be 1100, but only 500 remains
  });
});
