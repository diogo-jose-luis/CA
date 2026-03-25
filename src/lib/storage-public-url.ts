export type StorageImageUrlOptions = {
  /**
   * Usa `/api/backend-storage?p=…` (mesma origem + Bearer da sessão).
   * Recomendado em produção na Vercel e em WebView Android.
   */
  useAppStorageProxy?: boolean;
};

/**
 * Ficheiros estáticos (`/storage/...`) ficam na raiz do host da API, não sob `/api`.
 * Se `NEXT_PUBLIC_KUKAXI_API_BASE_URL` terminar em `/api`, remove-se para evitar 404.
 */
export function normalizePublicBaseForFiles(apiBaseUrl: string): string {
  let b = apiBaseUrl.replace(/\/$/, "");
  if (b.endsWith("/api")) {
    b = b.slice(0, -4).replace(/\/$/, "");
  }
  return b;
}

/**
 * Constrói URL pública para ficheiros na API Kukaxi.
 * — URLs absolutas http(s) são devolvidas sem alteração;
 * — caminho com "/" inicial: anexado à base (ex.: `/storage/...` ou `/acessos/...`), com segmentos codificados;
 * — caminho relativo sem "/": prefixo `/storage/` (comportamento anterior do dashboard).
 */
export function storageImagePublicUrl(
  apiBaseUrl: string,
  filename: string | null | undefined,
  options?: StorageImageUrlOptions,
): string | null {
  if (!filename) return null;
  const trimmed = String(filename).trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  if (options?.useAppStorageProxy) {
    return `/api/backend-storage?p=${encodeURIComponent(trimmed)}`;
  }

  const base = normalizePublicBaseForFiles(apiBaseUrl);
  const segments = trimmed.replace(/^\/+/, "").split("/").filter(Boolean).map((p) => encodeURIComponent(p));
  if (segments.length === 0) return null;

  const path = segments.join("/");
  if (trimmed.startsWith("/")) {
    return `${base}/${path}`;
  }
  return `${base}/storage/${path}`;
}
