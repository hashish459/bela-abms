import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { generateProductBarcode } from "@/server/inventory/service";

export const POST = handler(
  async (_req: Request, ctx: RouteContext<"/api/inventory/products/[id]/barcode">) => {
    const { companyId, session } = await guard("inventory.product_item", "update");
    const { id } = await ctx.params;
    const product = await generateProductBarcode(companyId, session.id, id);
    return ok({ barcodeValue: product.barcodeValue });
  },
);
