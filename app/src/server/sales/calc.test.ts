import { describe, expect, it } from "vitest";
import { calcSalesTotals } from "./calc";

describe("calcSalesTotals", () => {
  it("single taxable line, VAT 13%, exclusive", () => {
    const r = calcSalesTotals([{ qty: 10, rate: 100, taxRatePct: 13 }]);
    expect(r.subtotal).toBe("1000.00");
    expect(r.taxableTotal).toBe("1000.00");
    expect(r.nonTaxableTotal).toBe("0.00");
    expect(r.vatAmount).toBe("130.00");
    expect(r.grandTotal).toBe("1130.00");
  });

  it("non-taxable line carries no VAT", () => {
    const r = calcSalesTotals([{ qty: 5, rate: 200, isNonTaxable: true }]);
    expect(r.nonTaxableTotal).toBe("1000.00");
    expect(r.taxableTotal).toBe("0.00");
    expect(r.vatAmount).toBe("0.00");
    expect(r.grandTotal).toBe("1000.00");
  });

  it("mixed taxable + non-taxable", () => {
    const r = calcSalesTotals([
      { qty: 2, rate: 500, taxRatePct: 13 }, // 1000 taxable
      { qty: 1, rate: 300, isNonTaxable: true }, // 300 non-taxable
    ]);
    expect(r.taxableTotal).toBe("1000.00");
    expect(r.nonTaxableTotal).toBe("300.00");
    expect(r.vatAmount).toBe("130.00");
    expect(r.grandTotal).toBe("1430.00");
  });

  it("per-line discount reduces the taxable base", () => {
    const r = calcSalesTotals([{ qty: 10, rate: 100, discount: 100, taxRatePct: 13 }]);
    expect(r.subtotal).toBe("900.00");
    expect(r.lineDiscountTotal).toBe("100.00");
    expect(r.taxableTotal).toBe("900.00");
    expect(r.vatAmount).toBe("117.00");
    expect(r.grandTotal).toBe("1017.00");
  });

  it("header discount is apportioned across taxable lines and VAT recomputed", () => {
    const r = calcSalesTotals(
      [
        { qty: 1, rate: 600, taxRatePct: 13 },
        { qty: 1, rate: 400, taxRatePct: 13 },
      ],
      100, // header discount
    );
    // taxable base 1000 - 100 = 900; VAT 13% = 117
    expect(r.invoiceDiscount).toBe("100.00");
    expect(r.taxableTotal).toBe("900.00");
    expect(r.vatAmount).toBe("117.00");
    expect(r.grandTotal).toBe("1017.00");
    // apportioned 60 / 40
    expect(r.lines[0].headerDiscountShare).toBe("60.00");
    expect(r.lines[1].headerDiscountShare).toBe("40.00");
  });

  it("header discount does not touch non-taxable lines", () => {
    const r = calcSalesTotals(
      [
        { qty: 1, rate: 1000, taxRatePct: 13 },
        { qty: 1, rate: 500, isNonTaxable: true },
      ],
      200,
    );
    expect(r.taxableTotal).toBe("800.00");
    expect(r.nonTaxableTotal).toBe("500.00");
    expect(r.vatAmount).toBe("104.00");
    expect(r.grandTotal).toBe("1404.00");
  });

  it("header discount is clamped to the taxable base", () => {
    const r = calcSalesTotals([{ qty: 1, rate: 100, taxRatePct: 13 }], 9999);
    expect(r.invoiceDiscount).toBe("100.00");
    expect(r.taxableTotal).toBe("0.00");
    expect(r.vatAmount).toBe("0.00");
    expect(r.grandTotal).toBe("0.00");
  });

  it("tax-inclusive line backs the VAT out of the rate", () => {
    // rate 113 incl. 13% VAT → net 100, VAT 13
    const r = calcSalesTotals([{ qty: 1, rate: 113, taxRatePct: 13, priceInclusive: true }]);
    expect(r.taxableTotal).toBe("100.00");
    expect(r.vatAmount).toBe("13.00");
    expect(r.grandTotal).toBe("113.00");
  });

  it("rounds VAT to 2dp per accounting convention", () => {
    const r = calcSalesTotals([{ qty: 3, rate: 33.33, taxRatePct: 13 }]);
    // 99.99 × 0.13 = 12.9987 → 13.00
    expect(r.taxableTotal).toBe("99.99");
    expect(r.vatAmount).toBe("13.00");
    expect(r.grandTotal).toBe("112.99");
  });

  it("empty document is all zeros", () => {
    const r = calcSalesTotals([]);
    expect(r.grandTotal).toBe("0.00");
    expect(r.vatAmount).toBe("0.00");
  });
});
