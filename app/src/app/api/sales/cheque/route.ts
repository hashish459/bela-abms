import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { chequeCreate } from "@/server/cheque/schemas";
import { createCheque, listCheques } from "@/server/cheque/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("sales.cheque", "read");
  return ok(
    await listCheques(companyId, {
      page: Number(new URL(req.url).searchParams.get("page") ?? 1),
    }),
  );
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("sales.cheque", "create");
  const input = chequeCreate.parse(await req.json());
  const cheque = await createCheque(companyId, session.id, input);
  return ok({ cheque }, { status: 201 });
});
