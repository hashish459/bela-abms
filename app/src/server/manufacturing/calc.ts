import { Prisma } from "@prisma/client";

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const r2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
const r4 = (d: Prisma.Decimal) => d.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

export type ComponentInput = {
  componentProductId: string;
  qtyPerBatch: Prisma.Decimal.Value;
  unitCost: Prisma.Decimal.Value; // weighted-average cost at time of consumption
};

export type ProductionCostResult = {
  lines: { componentProductId: string; qty: string; unitCost: string; amount: string }[];
  materialCost: string;
  laborCost: string;
  totalCost: string;
  outputQty: string;
  unitCost: string; // totalCost / outputQty, feeds the output StockMovement
};

/**
 * Pure cost roll-up for one Production Order: scales every BOM component and the labor
 * allowance by `batches`, sums material cost, and derives the output's per-unit cost as
 * (material + labor) / output quantity — the value the finished-goods stock movement and
 * the GL Dr Finished Inventory line both use.
 */
export function calcProductionCost(
  components: ComponentInput[],
  batches: Prisma.Decimal.Value,
  laborCostPerBatch: Prisma.Decimal.Value,
  outputQtyPerBatch: Prisma.Decimal.Value,
): ProductionCostResult {
  const b = D(batches);

  const lines = components.map((c) => {
    const qty = D(c.qtyPerBatch).mul(b);
    const amount = qty.mul(c.unitCost);
    return {
      componentProductId: c.componentProductId,
      qty: qty.toFixed(3),
      unitCost: D(c.unitCost).toFixed(4),
      amount: r2(amount).toFixed(2),
    };
  });

  const materialCost = lines.reduce((a, l) => a.add(l.amount), D(0));
  const laborCost = r2(D(laborCostPerBatch).mul(b));
  const totalCost = r2(materialCost.add(laborCost));
  const outputQty = D(outputQtyPerBatch).mul(b);
  const unitCost = outputQty.gt(0) ? r4(totalCost.div(outputQty)) : D(0);

  return {
    lines,
    materialCost: r2(materialCost).toFixed(2),
    laborCost: laborCost.toFixed(2),
    totalCost: totalCost.toFixed(2),
    outputQty: outputQty.toFixed(3),
    unitCost: unitCost.toFixed(4),
  };
}
