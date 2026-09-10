import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listCategories } from "@/server/inventory/service";
import { CategoryManager } from "./category-manager";

export const metadata = { title: "Product Category — Bela ABMS" };

export default async function ProductCategoryPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "inventory.product_category", "read")) redirect("/dashboard");
  return (
    <CategoryManager
      initial={await listCategories(s.companyId!)}
      canCreate={can(s.permissions, "inventory.product_category", "create")}
      canUpdate={can(s.permissions, "inventory.product_category", "update")}
      canDelete={can(s.permissions, "inventory.product_category", "delete")}
    />
  );
}
