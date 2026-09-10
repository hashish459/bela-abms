import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/cookies";
import { verifyAccessToken } from "@/lib/jwt";

// Next.js 16 "proxy" convention (formerly middleware). Guards the authenticated
// app shell only — fine-grained permission checks happen server-side in each
// route handler / server component (never trust this edge check alone).
const PROTECTED = ["/dashboard"];
const AUTH_PAGES = ["/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(ACCESS_COOKIE)?.value;

  let authed = false;
  if (token) {
    try {
      await verifyAccessToken(token);
      authed = true;
    } catch {
      authed = false;
    }
  }

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);

  if (isProtected && !authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
