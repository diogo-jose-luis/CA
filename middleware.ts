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

/** Ficheiros em `public/` — não aplicar auth nem next-intl (senão /banners/*.png redireciona para login). */
const PUBLIC_ASSET_EXT =
  /\.(?:png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|mp4|webm|pdf)$/i;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /**
   * `<img src="backend-storage?…">` (URL relativa) resolve para `/pt/backend-storage` nas páginas com locale.
   * Reescreve para a rota real em `/api/backend-storage`.
   */
  if (pathname === "/backend-storage") {
    const url = req.nextUrl.clone();
    url.pathname = "/api/backend-storage";
    return NextResponse.rewrite(url);
  }
  const localeBackendStorage = pathname.match(/^\/(pt|en|fr)\/backend-storage$/);
  if (localeBackendStorage) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/backend-storage";
    return NextResponse.rewrite(url);
  }
  /** Relativo `api/backend-storage?…` a partir de `/pt/…` → `/pt/api/backend-storage`. */
  const localePrefixedApiStorage = pathname.match(/^\/(pt|en|fr)\/api\/backend-storage$/);
  if (localePrefixedApiStorage) {
    const url = req.nextUrl.clone();
    url.pathname = "/api/backend-storage";
    return NextResponse.rewrite(url);
  }

  // Rotas de API não devem passar pelo next-intl: em produção isso pode gerar
  // redirecionamentos (ex.: 307) e o browser pode não persistir o Set-Cookie do login.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_ASSET_EXT.test(pathname)) {
    return NextResponse.next();
  }

  const locale = getLocale(pathname);
  const isLogin = /^\/(pt|en|fr)\/login\/?$/.test(pathname) || pathname == "/login";
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