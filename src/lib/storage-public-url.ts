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
 * A API por vezes devolve `acesso_imagens/…`, `acesso_images/…` ou `acesso_imangens/…`,
 * mas no disco (Laravel `storage/app/public`) a pasta real pode ser `acess/` (cPanel).
 * Gera variantes a tentar no proxy até uma responder 200.
 */
export function expandStoragePathCandidates(filename: string): string[] {
  const trimmed = String(filename).trim();
  if (!trimmed) return [];
  if (/^https?:\/\//i.test(trimmed)) return [trimmed];

  const normalized = trimmed.replace(/^\/+/, "");
  const out: string[] = [];
  const add = (s: string) => {
    if (s && !out.includes(s)) out.push(s);
  };

  add(normalized);

  const wrongFolder = /^(acesso_imagens|acesso_images|acesso_imangens|acesso_imagem)\//i;
  if (wrongFolder.test(normalized)) {
    add(normalized.replace(wrongFolder, "acess/"));
  }

  const parts = normalized.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const file = parts[parts.length - 1];
    if (file) add(`acess/${file}`);
  }

  return out;
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
    /** Sempre path absoluto na origem (evita resolver como `/pt/backend-storage` em páginas com locale). */
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
