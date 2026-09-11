import { z } from "zod";
import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { db } from "@/lib/db";
import { calcPurchaseTotals, type PurchaseCalcLineInput } from "@/server/purchase/calc";

const Body = z.object({
  invoiceDiscount: z.coerce.number().min(0).default(0),
  lines: z.array(
    z.object({
      productId: z.string().optional(),
      qty: z.coerce.number(),
      rate: z.coerce.number(),
      discount: z.coerce.number().min(0).default(0),
      exciseDuty: z.coerce.number().min(0).default(0),
      customDuty: z.coerce.number().min(0).default(0),
      taxRateId: z.string().optional(),
      isNonTaxable: z.boolean().default(false),
    }),
  ),
});

/** Preview totals for the purchase form — same engine as the server write. */
export const POST = handler(async (req: Request) => {
  const { companyId } = await guard("purchase.purchase_invoice", "read");
  const body = Body.parse(await req.json());

  const taxIds = [...new Set(body.lines.map((l) => l.taxRateId).filter(Boolean) as string[])];
  const rates = taxIds.length
    ? await db.taxRate.findMany({ where: { id: { in: taxIds }, companyId }, select: { id: true, ratePct: true, isNoTax: true } })
    : [];
  const rateById = new Map(rates.map((r) => [r.id, r]));

  const productIds = [...new Set(body.lines.map((l) => l.productId).filter(Boolean) as string[])];
  const products = productIds.length
    ? await db.product.findMany({ where: { id: { in: productIds }, companyId }, select: { id: true, isNonTaxable: true } })
    : [];
  const productById = new Map(products.map((p) => [p.id, p]));

  const calcLines: PurchaseCalcLineInput[] = body.lines.map((l) => {
    const rate = l.taxRateId ? rateById.get(l.taxRateId) : undefined;
    const product = l.productId ? productById.get(l.productId) : undefined;
    const nonTaxable = l.isNonTaxable || !!rate?.isNoTax || !!product?.isNonTaxable || !rate;
    return {
      qty: l.qty || 0, rate: l.rate || 0, discount: l.discount || 0,
      exciseDuty: l.exciseDuty || 0, customDuty: l.customDuty || 0,
      taxRatePct: rate ? Number(rate.ratePct) : 0, isNonTaxable: nonTaxable,
    };
  });

  return ok(calcPurchaseTotals(calcLines, body.invoiceDiscount));
});
