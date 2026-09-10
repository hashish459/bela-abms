import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { categoryCreate } from "@/server/inventory/schemas";
import { createCategory, listCategories } from "@/server/inventory/service";

export const GET = handler(async () => {
  const { companyId } = await guard("inventory.product_category", "read");
  return ok({ categories: await listCategories(companyId) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("inventory.product_category", "create");
  const input = categoryCreate.parse(await req.json());
  return ok({ category: await createCategory(companyId, session.id, input) }, { status: 201 });
});
