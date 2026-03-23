/** URLs públicas da API Kukaxi (fallback alinhado com o login em produção). */
const PROD_API_REQUEST = "https://api-ca.alv-jamba.com/api";
const PROD_API_PUBLIC = "https://api-ca.alv-jamba.com";
const DEV_API_REQUEST = "http://127.0.0.1:8000/api";
const DEV_API_PUBLIC = "http://127.0.0.1:8000";

export function getKukaxiApiRequestBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_KUKAXI_API_BASE_URL_REQUEST;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return DEV_API_REQUEST;
  return PROD_API_REQUEST.replace(/\/$/, "");
}

export function getKukaxiPublicBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_KUKAXI_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return DEV_API_PUBLIC;
  return PROD_API_PUBLIC.replace(/\/$/, "");
}

/**
 * Base usada pelo axios no browser. No Android WebView as chamadas diretas à API
 * falham frequentemente (CORS / Origin / rede); o mesmo origin via `/api/backend`
 * contorna isso.
 */
export function resolveApiClientBase(): { base: string; viaProxy: boolean } {
  const upstream = getKukaxiApiRequestBaseUrl();
  if (typeof window === "undefined") {
    return { base: upstream, viaProxy: false };
  }
  const forceProxy =
    process.env.NEXT_PUBLIC_USE_BACKEND_PROXY === "true" ||
    process.env.NEXT_PUBLIC_USE_BACKEND_PROXY === "1";
  const androidWebView = /\b; wv\b/i.test(navigator.userAgent || "");
  if (forceProxy || androidWebView) {
    return {
      base: `${window.location.origin}/api/backend`,
      viaProxy: true,
    };
  }
  return { base: upstream, viaProxy: false };
}
