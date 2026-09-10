import { ok, errors, handler } from "@/lib/api";
import { guard } from "@/lib/guard";
import { activeFiscalYearId } from "@/lib/fiscal-year";
import { contactCreate } from "@/server/accounts/schemas";
import { createContact, listContacts } from "@/server/accounts/service";

export const GET = handler(async (req: Request) => {
  const { companyId } = await guard("accounts.contacts", "read");
  const url = new URL(req.url);
  const kind = (url.searchParams.get("kind") ?? "CUSTOMER").toUpperCase();
  if (kind !== "CUSTOMER" && kind !== "SUPPLIER")
    throw errors.badRequest("kind must be CUSTOMER or SUPPLIER");
  return ok({
    contacts: await listContacts(companyId, kind, url.searchParams.get("search") ?? undefined),
  });
});

export const POST = handler(async (req: Request) => {
  const { companyId, session } = await guard("accounts.contacts", "create");
  const input = contactCreate.parse(await req.json());
  const fyId = await activeFiscalYearId(companyId).catch(() => null);
  const created = await createContact(companyId, fyId, session.id, input);
  return ok({ contact: created }, { status: 201 });
});
