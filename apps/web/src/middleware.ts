import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  APP_ORIGIN,
  MARKETING_ORIGIN,
  MARKETING_PATHS,
  hostnameOf,
  isAppHost,
  isLocalHost,
  isMarketingHost,
} from "@/lib/hosts";
import { DASHBOARD_PATH, safeAppPath } from "@/lib/auth/next-path";

export function middleware(request: NextRequest) {
  const host = hostnameOf(request.headers.get("host"));
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(
    process.env.SESSION_COOKIE_NAME ?? "autodm_session",
  );

  // Meta/Razorpay POST bodies + signature headers must not be redirected.
  if (pathname.startsWith("/api/webhooks/")) {
    return NextResponse.next();
  }

  if (!isLocalHost(host) && isMarketingHost(host)) {
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/api")
    ) {
      return NextResponse.redirect(
        new URL(pathname + request.nextUrl.search, APP_ORIGIN),
      );
    }
  }

  if (!isLocalHost(host) && isAppHost(host)) {
    if (pathname === "/") {
      return NextResponse.redirect(
        new URL(session ? DASHBOARD_PATH : "/auth/login", APP_ORIGIN),
      );
    }
    if (MARKETING_PATHS.has(pathname) && pathname !== "/") {
      return NextResponse.redirect(
        new URL(pathname + request.nextUrl.search, MARKETING_ORIGIN),
      );
    }
  }

  if (pathname.startsWith("/dashboard") && !session) {
    const login = new URL("/auth/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  if ((pathname === "/auth/login" || pathname === "/auth/signup") && session) {
    const next = safeAppPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|brand|favicon.ico|api/webhooks/).*)",
  ],
};
