import { ok, handler } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { listUserSessions } from "@/server/settings/service";

export const GET = handler(async () => {
  const session = await requireSession();
  return ok({ sessions: await listUserSessions(session.id) });
});
