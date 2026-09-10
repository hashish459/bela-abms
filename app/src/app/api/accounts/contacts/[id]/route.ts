import { ok, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { contactUpdate } from "@/server/accounts/schemas";
import { updateContact } from "@/server/accounts/service";

export const PATCH = handler(
  async (req: Request, ctx: RouteContext<"/api/accounts/contacts/[id]">) => {
    const { companyId, session } = await guard("accounts.contacts", "update");
    const { id } = await ctx.params;
    const input = contactUpdate.parse(await req.json());
    return ok({ contact: await updateContact(companyId, session.id, id, input) });
  },
);
