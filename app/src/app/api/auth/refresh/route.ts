import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { ok, errors, handler } from "@/lib/api";
import { ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE, clearedCookie } from "@/lib/cookies";
import { verifyRefreshToken } from "@/lib/jwt";
import {
  findValidRefreshToken,
  issueSession,
  revokeRefreshTokenById,
} from "@/lib/session";
import { clientIp } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

// Unauthenticated-reachable (only needs the refresh cookie, no active
// session) — unlike every other route here, so it gets its own throttle
// rather than relying on RBAC to bound abuse. 20/min per IP is generous for
// legitimate use (a browser refreshes once per access-token lifetime) but
// blocks rapid automated replay of a stolen refresh cookie.
const REFRESH_WINDOW_MS = 60 * 1000;
const REFRESH_MAX = 20;

// Rotating refresh: old token is revoked, a new pair issued.
export const POST = handler(async (req: Request) => {
  const ip = clientIp(req) ?? "unknown";
  if (!checkRateLimit(`refresh:${ip}`, REFRESH_MAX, REFRESH_WINDOW_MS)) throw errors.rateLimited();

  const jar = await cookies();
  const raw = jar.get(REFRESH_COOKIE)?.value;
  if (!raw) throw errors.unauthorized("No refresh token");

  let claims;
  try {
    claims = await verifyRefreshToken(raw);
  } catch {
    const res = errors.unauthorized("Invalid refresh token");
    throw res;
  }

  const row = await findValidRefreshToken(raw);
  if (!row || row.userId !== claims.sub) {
    // token reuse / revoked — clear cookies
    const bad = ok({ refreshed: false }, { status: 401 });
    bad.cookies.set(clearedCookie(ACCESS_COOKIE));
    bad.cookies.set(clearedCookie(REFRESH_COOKIE));
    bad.cookies.set(clearedCookie(CSRF_COOKIE));
    return bad;
  }

  await revokeRefreshTokenById(row.id);

  const user = await db.user.findFirst({
    where: { id: claims.sub, deletedAt: null, status: "ACTIVE" },
    include: { companyLinks: true },
  });
  if (!user) throw errors.unauthorized();

  const companyId =
    user.companyLinks.find((l) => l.isDefault)?.companyId ??
    user.companyLinks[0]?.companyId ??
    null;

  const { cookies: fresh } = await issueSession({
    userId: user.id,
    companyId,
    userType: user.userType,
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  const res = ok({ refreshed: true });
  for (const c of fresh) res.cookies.set(c);
  return res;
});
