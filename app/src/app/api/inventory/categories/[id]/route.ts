import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { categoryUpdate } from "@/server/inventory/schemas";
import { deleteCategory, updateCategory } from "@/server/inventory/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/inventory/categories/[id]">) => {
    const { companyId, session } = await guard("inventory.product_category", "update");
    const { id } = await ctx.params;
    const input = categoryUpdate.parse(await req.json());
    return ok({ category: await updateCategory(companyId, session.id, id, input) });
  },
);

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/inventory/categories/[id]">) => {
    const { companyId, session } = await guard("inventory.product_category", "delete");
    const { id } = await ctx.params;
    await deleteCategory(companyId, session.id, id);
    return ok({ deleted: true });
  },
);
