import "server-only";
import { randomUUID, createHash } from "crypto";
import { db } from "./db";
import { env } from "./env";
import { signAccessToken, signRefreshToken } from "./jwt";
import { accessCookie, refreshCookie, csrfCookie } from "./cookies";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * Issue a new access + refresh token pair for a user and persist the refresh
 * token (hashed) so it can be revoked. Returns cookies to set on the response.
 */
export async function issueSession(opts: {
  userId: string;
  companyId: string | null;
  userType: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const jti = randomUUID();
  const [access, refresh] = await Promise.all([
    signAccessToken({ sub: opts.userId, companyId: opts.companyId, userType: opts.userType }),
    signRefreshToken(opts.userId, jti),
  ]);

  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400_000);
  await db.refreshToken.create({
    data: {
      id: jti,
      userId: opts.userId,
      tokenHash: sha256(refresh),
      expiresAt,
      ip: opts.ip ?? null,
      userAgent: opts.userAgent ?? null,
    },
  });

  const csrfToken = randomUUID();
  return { cookies: [accessCookie(access), refreshCookie(refresh), csrfCookie(csrfToken)] };
}

/** Validate a refresh token string against the store. Returns the row or null. */
export async function findValidRefreshToken(raw: string) {
  const row = await db.refreshToken.findUnique({ where: { tokenHash: sha256(raw) } });
  if (!row || row.revokedAt || row.expiresAt < new Date()) return null;
  return row;
}

export async function revokeRefreshToken(raw: string) {
  await db.refreshToken
    .updateMany({ where: { tokenHash: sha256(raw) }, data: { revokedAt: new Date() } })
    .catch(() => void 0);
}

export async function revokeRefreshTokenById(id: string) {
  await db.refreshToken
    .update({ where: { id }, data: { revokedAt: new Date() } })
    .catch(() => void 0);
}
