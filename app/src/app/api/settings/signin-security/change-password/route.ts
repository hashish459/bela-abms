import { ok, handler } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertCsrf } from "@/lib/guard";
import { changePassword } from "@/server/settings/schemas";
import { changeUserPassword } from "@/server/settings/service";

// No permission-module gate: changing your OWN password is a base account
// action every authenticated user has, same as logout — but unlike logout it
// changes a credential, so it still needs the CSRF check guard() would give it.
export const POST = handler(async (req: Request) => {
  const session = await requireSession();
  await assertCsrf();
  const input = changePassword.parse(await req.json());
  await changeUserPassword(session.id, input);
  return ok({ changed: true });
});
