import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { listBoms } from "@/server/manufacturing/service";
import { BomWorkspace } from "./bom-workspace";

export const metadata = { title: "Bill of Materials — Bela ABMS" };

export default async function BomPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "manufacturing.bill_of_materials", "read")) redirect("/dashboard");

  const products = await db.product.findMany({
    where: { companyId: s.companyId!, deletedAt: null, kind: "GOODS" },
    select: { id: true, name: true, sku: true, inventoryRole: true, unit: { select: { shortName: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <BomWorkspace
      initial={await listBoms(s.companyId!)}
      finishedGoods={products.filter((p) => p.inventoryRole === "FINISHED_GOODS").map((p) => ({ id: p.id, name: p.name, unit: p.unit.shortName }))}
      rawMaterials={products.filter((p) => p.inventoryRole === "RAW_MATERIAL").map((p) => ({ id: p.id, name: p.name, unit: p.unit.shortName }))}
      canCreate={can(s.permissions, "manufacturing.bill_of_materials", "create")}
    />
  );
}
