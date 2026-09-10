import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { listProducts, listCategories, listUnits, listWarehouses } from "@/server/inventory/service";
import { ProductsWorkspace } from "./products-workspace";

export const metadata = { title: "Products — Bela ABMS" };

export default async function ProductsPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "inventory.product_item", "read")) redirect("/dashboard");

  const [goods, categories, units, warehouses, taxRates] = await Promise.all([
    listProducts(s.companyId!, { kind: "GOODS", page: 1 }),
    listCategories(s.companyId!),
    listUnits(s.companyId!),
    listWarehouses(s.companyId!),
    db.taxRate.findMany({
      where: { companyId: s.companyId!, deletedAt: null, isActive: true },
      select: { id: true, name: true, ratePct: true, isNoTax: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ProductsWorkspace
      initial={goods}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      units={units.map((u) => ({ id: u.id, name: u.name, shortName: u.shortName }))}
      warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
      taxRates={taxRates.map((t) => ({ ...t, ratePct: Number(t.ratePct) }))}
      canCreate={can(s.permissions, "inventory.product_item", "create")}
    />
  );
}
