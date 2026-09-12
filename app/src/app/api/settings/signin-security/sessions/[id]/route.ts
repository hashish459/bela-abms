import { ok, handler } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertCsrf } from "@/lib/guard";
import { revokeUserSession } from "@/server/settings/service";

export const DELETE = handler(
  async (_req: Request, ctx: RouteContext<"/api/settings/signin-security/sessions/[id]">) => {
    const session = await requireSession();
    await assertCsrf();
    const { id } = await ctx.params;
    await revokeUserSession(session.id, id);
    return ok({ revoked: true });
  },
);
