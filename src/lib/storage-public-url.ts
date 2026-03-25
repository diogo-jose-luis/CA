/**
 * Constrói URL pública para ficheiros na API Kukaxi.
 * — URLs absolutas http(s) são devolvidas sem alteração;
 * — caminho com "/" inicial: anexado à base (ex.: `/storage/...` ou `/acessos/...`), com segmentos codificados;
 * — caminho relativo sem "/": prefixo `/storage/` (comportamento anterior do dashboard).
 */
export function storageImagePublicUrl(
  apiBaseUrl: string,
  filename: string | null | undefined,
): string | null {
  if (!filename) return null;
  const trimmed = String(filename).trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  const base = apiBaseUrl.replace(/\/$/, "");
  const segments = trimmed.replace(/^\/+/, "").split("/").filter(Boolean).map((p) => encodeURIComponent(p));
  if (segments.length === 0) return null;

  const path = segments.join("/");
  if (trimmed.startsWith("/")) {
    return `${base}/${path}`;
  }
  return `${base}/storage/${path}`;
}
