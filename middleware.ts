// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

const SESSION_COOKIE = "ca_session";
const LOCALE_REGEX = /^\/(pt|en|fr)(\/|$)/;

const intlMiddleware = createMiddleware({
  locales: ["pt", "en", "fr"],
  defaultLocale: "pt"
});

function getLocale(pathname: string): string {
  const m = pathname.match(LOCALE_REGEX);
  return m ? m[1] : "pt";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api")
  ) {
    return intlMiddleware(req);
  }

  const locale = getLocale(pathname);
  const isLogin = /^\/(pt|en|fr)\/login\/?$/.test(pathname) || pathname === "/login";
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (isLogin && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  if (isLogin) {
    return intlMiddleware(req);
  }

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};