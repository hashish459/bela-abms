import { cookies } from "next/headers";
import { ok, handler } from "@/lib/api";
import { ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE, clearedCookie } from "@/lib/cookies";
import { revokeRefreshToken } from "@/lib/session";
import { getSession } from "@/lib/auth";
import { writeAudit, clientIp } from "@/lib/audit";

export const POST = handler(async (req: Request) => {
  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  const session = await getSession();

  if (refresh) await revokeRefreshToken(refresh);
  if (session)
    await writeAudit({
      userId: session.id,
      companyId: session.companyId,
      action: "LOGOUT",
      ip: clientIp(req),
    });

  const res = ok({ loggedOut: true });
  res.cookies.set(clearedCookie(ACCESS_COOKIE));
  res.cookies.set(clearedCookie(REFRESH_COOKIE));
  res.cookies.set(clearedCookie(CSRF_COOKIE));
  return res;
});
