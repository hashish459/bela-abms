import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { goodsReceiptCreate } from "@/server/goods-receipt/schemas";
import { createGoodsReceipt, listGoodsReceipts } from "@/server/goods-receipt/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("purchase.goods_received", "read");
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  return ok(
    await listGoodsReceipts(companyId, fyId, {
      page: Number(new URL(req.url).searchParams.get("page") ?? 1),
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("purchase.goods_received", "create");
  const input = goodsReceiptCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId);
  const doc = await createGoodsReceipt(companyId, fyId, session.id, input);
  return ok({ doc }, { status: 201 });
});
