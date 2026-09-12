import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { billFooterUpdate } from "@/server/settings/schemas";
import { getBillFooter, upsertBillFooter } from "@/server/settings/service";

export const GET = handler(async () => {
  const { companyId } = await guard("settings.bill_footer", "read");
  return ok({ footer: await getBillFooter(companyId) });
});

export const PUT = handler(async (req: Request) => {
  const { companyId, session } = await guard("settings.bill_footer", "update");
  const input = billFooterUpdate.parse(await req.json());
  const saved = await upsertBillFooter(companyId, session.id, input);
  return ok({ footer: saved });
});
