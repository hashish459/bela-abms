import { ok, errors, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { productCreate } from "@/server/inventory/schemas";
import { createProduct, listProducts } from "@/server/inventory/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("inventory.product_item", "read");
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind")?.toUpperCase() as
    | "GOODS" | "SERVICE" | "EXPENSE" | undefined;
  if (kind && !["GOODS", "SERVICE", "EXPENSE"].includes(kind))
    throw errors.badRequest("Invalid kind");
  return ok(
    await listProducts(companyId, {
      kind,
      search: url.searchParams.get("search") ?? undefined,
      categoryId: url.searchParams.get("categoryId") ?? undefined,
      page: Number(url.searchParams.get("page") ?? 1),
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("inventory.product_item", "create");
  const input = productCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  const product = await createProduct(companyId, fyId, session.id, input);
  return ok({ product: { id: product.id, sku: product.sku } }, { status: 201 });
});
