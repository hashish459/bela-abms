import { env } from "./env";

export const ACCESS_COOKIE = "abms_access";
export const REFRESH_COOKIE = "abms_refresh";

const base = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax" as const,
  path: "/",
};

export function accessCookie(value: string) {
  return { name: ACCESS_COOKIE, value, ...base, maxAge: 60 * 30 }; // 30 min ceiling
}

export function refreshCookie(value: string) {
  return {
    name: REFRESH_COOKIE,
    value,
    ...base,
    maxAge: 60 * 60 * 24 * env.REFRESH_TOKEN_TTL_DAYS,
  };
}

export function clearedCookie(name: string) {
  return { name, value: "", ...base, maxAge: 0 };
}
