import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { productUpdate } from "@/server/inventory/schemas";
import { getProduct, updateProduct } from "@/server/inventory/service";

export const GET = handler(
  async (_req: Request, ctx: RouteContext<"/api/inventory/products/[id]">) => {
    const { companyId } = await guard("inventory.product_item", "read");
    const { id } = await ctx.params;
    return ok({ product: await getProduct(companyId, id) });
  },
);

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/inventory/products/[id]">) => {
    const { companyId, session } = await guard("inventory.product_item", "update");
    const { id } = await ctx.params;
    const input = productUpdate.parse(await req.json());
    return ok({ product: await updateProduct(companyId, session.id, id, input) });
  },
);
