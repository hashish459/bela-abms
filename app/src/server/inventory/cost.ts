import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Tx = Prisma.TransactionClient;
const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);

/**
 * Weighted-average cost of a product = total value of all inbound stock movements
 * (opening, purchase, returns-in, adjustments-in) ÷ total inbound quantity.
 * Used to value COGS when a sale is posted (perpetual inventory).
 * Falls back to the product's purchasePrice when there is no movement history.
 */
export async function weightedAverageCost(
  companyId: string,
  productId: string,
  client: Tx | typeof db = db,
): Promise<Prisma.Decimal> {
  const inbound = await client.stockMovement.findMany({
    where: { companyId, productId, qty: { gt: 0 } },
    select: { qty: true, unitCost: true },
  });

  let totalQty = D(0);
  let totalValue = D(0);
  for (const m of inbound) {
    totalQty = totalQty.add(m.qty);
    totalValue = totalValue.add(D(m.qty).mul(m.unitCost));
  }

  if (totalQty.gt(0)) return totalValue.div(totalQty);

  const product = await client.product.findUnique({
    where: { id: productId },
    select: { purchasePrice: true },
  });
  return D(product?.purchasePrice ?? 0);
}
