import { describe, it, expect } from "vitest";
import { calcProductionCost } from "./calc";

describe("calcProductionCost", () => {
  const components = [
    { componentProductId: "wood", qtyPerBatch: 4, unitCost: 250 }, // 1000/batch
    { componentProductId: "screws", qtyPerBatch: 20, unitCost: 2.5 }, // 50/batch
  ];

  it("scales every component by the number of batches", () => {
    const r = calcProductionCost(components, 3, 0, 1);
    expect(r.lines[0].qty).toBe("12.000"); // 4 * 3
    expect(r.lines[0].amount).toBe("3000.00"); // 12 * 250
    expect(r.lines[1].qty).toBe("60.000"); // 20 * 3
    expect(r.lines[1].amount).toBe("150.00"); // 60 * 2.5
  });

  it("sums material cost across all components", () => {
    const r = calcProductionCost(components, 1, 0, 1);
    expect(r.materialCost).toBe("1050.00"); // 1000 + 50
  });

  it("scales labor cost by batches and adds it to total cost", () => {
    const r = calcProductionCost(components, 2, 300, 1);
    expect(r.laborCost).toBe("600.00"); // 300 * 2
    expect(r.materialCost).toBe("2100.00"); // 1050 * 2
    expect(r.totalCost).toBe("2700.00"); // 2100 + 600
  });

  it("derives unit cost as totalCost / outputQty", () => {
    // 1 batch = 1050 material + 0 labor = 1050 total, yields 5 output units
    const r = calcProductionCost(components, 1, 0, 5);
    expect(r.outputQty).toBe("5.000");
    expect(r.unitCost).toBe("210.0000"); // 1050 / 5
  });

  it("scales output quantity by batches too", () => {
    const r = calcProductionCost(components, 4, 0, 5);
    expect(r.outputQty).toBe("20.000"); // 5 * 4
  });

  it("returns zero unit cost (not a division error) when output quantity is zero", () => {
    const r = calcProductionCost(components, 1, 0, 0);
    expect(r.outputQty).toBe("0.000");
    expect(r.unitCost).toBe("0.0000");
  });

  it("handles a BOM with no components (labor-only production)", () => {
    const r = calcProductionCost([], 2, 500, 10);
    expect(r.materialCost).toBe("0.00");
    expect(r.laborCost).toBe("1000.00");
    expect(r.totalCost).toBe("1000.00");
    expect(r.unitCost).toBe("50.0000"); // 1000 / 20
  });
});
