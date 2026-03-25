export type StorageImageUrlOptions = {
  /**
   * Usa `/api/backend-storage?p=…` (mesma origem + Bearer da sessão).
   * Recomendado em produção na Vercel e em WebView Android.
   */
  useAppStorageProxy?: boolean;
};

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

  const base = apiBaseUrl.replace(/\/$/, "");
  const segments = trimmed.replace(/^\/+/, "").split("/").filter(Boolean).map((p) => encodeURIComponent(p));
  if (segments.length === 0) return null;

  const path = segments.join("/");
  if (trimmed.startsWith("/")) {
    return `${base}/${path}`;
  }
  return `${base}/storage/${path}`;
}
