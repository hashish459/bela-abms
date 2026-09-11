import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { fixedAssetCreate } from "@/server/assets/schemas";
import { createFixedAsset, listFixedAssets } from "@/server/assets/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("fixed_assets.asset_register", "read");
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as "ACTIVE" | "DISPOSED" | null;
  const category = url.searchParams.get("category");
  return ok({ assets: await listFixedAssets(companyId, { status: status ?? undefined, category: category ?? undefined }) });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("fixed_assets.asset_register", "create");
  const input = fixedAssetCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  const asset = await createFixedAsset(companyId, fyId, session.id, input);
  return ok({ asset }, { status: 201 });
});
