import { ok, handler } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { buildMenu } from "@/lib/menu";

export const GET = handler(async () => {
  const s = await requireSession();
  const tree = await buildMenu(s.permissions);
  return ok({ menu: tree });
});
