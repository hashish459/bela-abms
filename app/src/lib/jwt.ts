import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export type AccessClaims = {
  sub: string; // user id
  companyId: string | null;
  userType: string;
};

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, accessSecret);
  return {
    sub: String(payload.sub),
    companyId: (payload.companyId as string | null) ?? null,
    userType: String(payload.userType ?? "STAFF"),
  };
}

export async function signRefreshToken(userId: string, jti: string): Promise<string> {
  return new SignJWT({ jti })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${env.REFRESH_TOKEN_TTL_DAYS}d`)
    .sign(refreshSecret);
}

export async function verifyRefreshToken(
  token: string,
): Promise<{ sub: string; jti: string }> {
  const { payload } = await jwtVerify(token, refreshSecret);
  return { sub: String(payload.sub), jti: String(payload.jti) };
}
