import { env } from "./env";

export const ACCESS_COOKIE = "abms_access";
export const REFRESH_COOKIE = "abms_refresh";
export const CSRF_COOKIE = "abms_csrf";

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

/**
 * Double-submit CSRF token — deliberately NOT httpOnly, since the client
 * needs to read it and echo it back as a header (src/components/ui.tsx
 * `api()`); guard() (src/lib/guard.ts) verifies the two match on every
 * mutating request. Defense-in-depth on top of SameSite=Lax, which already
 * blocks cross-site POST/PATCH/DELETE for this same-origin app — this closes
 * the residual gap for contexts SameSite doesn't fully cover (older/webview
 * browsers, a compromised sibling subdomain).
 */
export function csrfCookie(value: string) {
  return { name: CSRF_COOKIE, value, httpOnly: false, secure: env.COOKIE_SECURE, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * env.REFRESH_TOKEN_TTL_DAYS };
}

export function clearedCookie(name: string) {
  return { name, value: "", ...base, maxAge: 0 };
}
