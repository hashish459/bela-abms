import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listFixedAssets } from "@/server/assets/service";
import { listContacts } from "@/server/accounts/service";
import { AssetRegisterWorkspace } from "./asset-register-workspace";

export const metadata = { title: "Asset Register — Bela ABMS" };

export default async function AssetRegisterPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "fixed_assets.asset_register", "read")) redirect("/dashboard");

  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);
  const [assets, suppliers, cashBank] = await Promise.all([
    listFixedAssets(s.companyId!),
    listContacts(s.companyId!, "SUPPLIER"),
    db.ledger.findMany({
      where: { companyId: s.companyId!, deletedAt: null, isActive: true, accountGroup: { accountHead: { code: "CCE" } } },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AssetRegisterWorkspace
      initial={assets}
      suppliers={suppliers.map((c) => ({ id: c.id, name: c.name }))}
      cashBank={cashBank}
      canCreate={can(s.permissions, "fixed_assets.asset_register", "create")}
      canDispose={can(s.permissions, "fixed_assets.asset_register", "update")}
      hasFiscalYear={!!fyId}
    />
  );
}
