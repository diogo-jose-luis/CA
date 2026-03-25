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

/** Remove `storage/` inicial se a API devolver caminho já com esse prefixo (evita `/storage/storage/…`). */
export function stripLeadingStorageFolder(relativePath: string): string {
  return relativePath.replace(/^\/+/, "").replace(/^storage\//i, "");
}

/**
 * A API por vezes devolve `acesso_imagens/…`, `acesso_images/…` ou `acesso_imangens/…`,
 * mas no disco (Laravel `storage/app/public`) a pasta real pode ser `acess/` ou `access/` (cPanel).
 * Gera variantes a tentar no proxy até uma responder 200.
 */
export function expandStoragePathCandidates(filename: string): string[] {
  const trimmed = String(filename).trim();
  if (!trimmed) return [];
  if (/^https?:\/\//i.test(trimmed)) return [trimmed];

  const normalized = stripLeadingStorageFolder(trimmed);
  const out: string[] = [];
  const add = (s: string) => {
    const x = stripLeadingStorageFolder(s);
    if (x && !out.includes(x)) out.push(x);
  };

  add(normalized);

  const wrongFolder = /^(acesso_imagens|acesso_images|acesso_imangens|acesso_imagem)\//i;
  if (wrongFolder.test(normalized)) {
    const tail = normalized.replace(wrongFolder, "");
    add(`acess/${tail}`);
    add(`access/${tail}`);
  }

  const parts = normalized.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const file = parts[parts.length - 1];
    if (file) {
      add(`acess/${file}`);
      add(`access/${file}`);
    }
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
    return `/api/backend-storage?p=${encodeURIComponent(stripLeadingStorageFolder(trimmed))}`;
  }

  const base = normalizePublicBaseForFiles(apiBaseUrl);

  if (trimmed.startsWith("/")) {
    const inner = trimmed.replace(/^\/+/, "");
    const segments = inner.split("/").filter(Boolean).map((p) => encodeURIComponent(p));
    if (segments.length === 0) return null;
    return `${base}/${segments.join("/")}`;
  }

  const rel = stripLeadingStorageFolder(trimmed);
  const segments = rel.split("/").filter(Boolean).map((p) => encodeURIComponent(p));
  if (segments.length === 0) return null;
  return `${base}/storage/${segments.join("/")}`;
}

/**
 * Garante `<img src>` com proxy correcto (alguns browsers/WebViews resolvem URLs mal).
 */
export function normalizeAppStorageImgSrc(src: string | null | undefined): string | null {
  if (src == null || src === "") return null;
  if (src.startsWith("/api/backend-storage")) return src;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/backend-storage") || src.startsWith("backend-storage")) {
    const q = src.includes("?") ? src.slice(src.indexOf("?")) : "";
    return `/api/backend-storage${q}`;
  }
  return src;
}
