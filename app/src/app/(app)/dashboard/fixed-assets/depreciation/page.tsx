import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { listDepreciationRuns, listFixedAssets } from "@/server/assets/service";
import { DepreciationWorkspace } from "./depreciation-workspace";

export const metadata = { title: "Depreciation — Bela ABMS" };

export default async function DepreciationPage() {
  const s = (await getSession())!;
  if (!can(s.permissions, "fixed_assets.depreciation", "read")) redirect("/dashboard");

  const fyId = await activeFiscalYearId(s.companyId!).catch(() => null);
  const [runs, assets] = await Promise.all([
    listDepreciationRuns(s.companyId!, fyId),
    listFixedAssets(s.companyId!, { status: "ACTIVE" }),
  ]);

  return (
    <DepreciationWorkspace
      initial={runs}
      activeAssetCount={assets.filter((a) => a.category !== "LAND").length}
      canRun={can(s.permissions, "fixed_assets.depreciation", "create")}
      hasFiscalYear={!!fyId}
    />
  );
}
