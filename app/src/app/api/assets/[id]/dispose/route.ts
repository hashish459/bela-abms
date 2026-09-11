import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { disposeAssetCreate } from "@/server/assets/schemas";
import { disposeAsset } from "@/server/assets/service";

export const POST = handler(async (req: Request, ctx: RouteContext<"/api/assets/[id]/dispose">) => {
  const { companyId, session } = await guard("fixed_assets.asset_register", "update");
  const { id } = await ctx.params;
  const input = disposeAssetCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  return ok(await disposeAsset(companyId, fyId, session.id, id, input));
});
