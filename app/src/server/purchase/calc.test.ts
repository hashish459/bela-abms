import { describe, expect, it } from "vitest";
import { calcPurchaseTotals } from "./calc";

describe("calcPurchaseTotals", () => {
  it("single taxable line, no duty", () => {
    const r = calcPurchaseTotals([{ qty: 10, rate: 100, taxRatePct: 13 }]);
    expect(r.subtotal).toBe("1000.00");
    expect(r.taxableTotal).toBe("1000.00");
    expect(r.vatAmount).toBe("130.00");
    expect(r.grandTotal).toBe("1130.00");
    expect(r.lines[0].landedUnitCost).toBe("100.0000");
  });

  it("excise + custom duty are capitalized into the taxable base and unit cost", () => {
    const r = calcPurchaseTotals([
      { qty: 10, rate: 100, exciseDuty: 50, customDuty: 30, taxRatePct: 13 },
    ]);
    // landed = 1000 + 50 + 30 = 1080; VAT 13% of 1080 = 140.40
    expect(r.subtotal).toBe("1000.00");
    expect(r.totalExciseDuty).toBe("50.00");
    expect(r.totalCustomDuty).toBe("30.00");
    expect(r.taxableTotal).toBe("1080.00");
    expect(r.vatAmount).toBe("140.40");
    expect(r.grandTotal).toBe("1220.40");
    // unit cost includes duty: 1080 / 10 = 108
    expect(r.lines[0].landedUnitCost).toBe("108.0000");
  });

  it("non-taxable line carries no VAT but duty still lands in cost", () => {
    const r = calcPurchaseTotals([
      { qty: 5, rate: 200, customDuty: 25, isNonTaxable: true },
    ]);
    expect(r.nonTaxableTotal).toBe("1025.00");
    expect(r.taxableTotal).toBe("0.00");
    expect(r.vatAmount).toBe("0.00");
    expect(r.grandTotal).toBe("1025.00");
    expect(r.lines[0].landedUnitCost).toBe("205.0000");
  });

  it("header discount apportions across taxable lines and VAT is recomputed post-duty", () => {
    const r = calcPurchaseTotals(
      [
        { qty: 1, rate: 600, exciseDuty: 0, taxRatePct: 13 },
        { qty: 1, rate: 400, exciseDuty: 0, taxRatePct: 13 },
      ],
      100,
    );
    expect(r.taxableTotal).toBe("900.00");
    expect(r.vatAmount).toBe("117.00");
    expect(r.grandTotal).toBe("1017.00");
    expect(r.lines[0].headerDiscountShare).toBe("60.00");
    expect(r.lines[1].headerDiscountShare).toBe("40.00");
  });

  it("capitalizedAmount (not the pre-discount landedAmount) is what GL/stock posting must use", () => {
    // regression test: a service-layer bug once summed the pre-discount landedAmount
    // to build the Inventory debit, throwing the voucher out of balance by the
    // header-discount amount. capitalizedAmount is the value actually posted.
    const r = calcPurchaseTotals(
      [{ qty: 100, rate: 100, exciseDuty: 200, customDuty: 300, taxRatePct: 13 }],
      500,
    );
    expect(r.lines[0].landedAmount).toBe("10500.00"); // pre-discount, display only
    expect(r.lines[0].capitalizedAmount).toBe("10000.00"); // post-discount — what gets Dr'd
    expect(r.lines[0].landedUnitCost).toBe("100.0000"); // 10000 / 100
    // sum of capitalizedAmount + VAT must equal the grand total (voucher balances)
    const sumCapitalized = r.lines.reduce((a, l) => a + Number(l.capitalizedAmount), 0);
    expect((sumCapitalized + Number(r.vatAmount)).toFixed(2)).toBe(r.grandTotal);
  });

  it("header discount is clamped to the taxable base", () => {
    const r = calcPurchaseTotals([{ qty: 1, rate: 100, taxRatePct: 13 }], 9999);
    expect(r.invoiceDiscount).toBe("100.00");
    expect(r.taxableTotal).toBe("0.00");
    expect(r.grandTotal).toBe("0.00");
  });

  it("line discount reduces the goods price before duty is added", () => {
    const r = calcPurchaseTotals([
      { qty: 10, rate: 100, discount: 100, exciseDuty: 20, taxRatePct: 13 },
    ]);
    // net = 1000 - 100 = 900; landed = 900 + 20 = 920; vat = 119.60
    expect(r.subtotal).toBe("900.00");
    expect(r.taxableTotal).toBe("920.00");
    expect(r.vatAmount).toBe("119.60");
    expect(r.grandTotal).toBe("1039.60");
  });

  it("empty document is all zeros", () => {
    const r = calcPurchaseTotals([]);
    expect(r.grandTotal).toBe("0.00");
    expect(r.vatAmount).toBe("0.00");
  });
});
