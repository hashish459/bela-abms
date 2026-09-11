import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { getFixedAsset } from "@/server/assets/service";

export const GET = handler(async (_req: Request, ctx: RouteContext<"/api/assets/[id]">) => {
  const { companyId } = await guard("fixed_assets.asset_register", "read");
  const { id } = await ctx.params;
  return ok({ asset: await getFixedAsset(companyId, id) });
});
