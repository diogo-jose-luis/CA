"use client";

import { useMemo } from "react";

function getLocaleFromPathname(pathname: string): string {
  const match = pathname.match(/^\/(pt|en|fr)(\/|$)/);
  return match?.[1] ?? "pt";
}

export default function LocaleErrorPage({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const loginUrl = useMemo(() => {
    if (typeof window === "undefined") return "/pt/login";
    const locale = getLocaleFromPathname(window.location.pathname);
    return `/${locale}/login`;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--panel-2)] px-4">
      <div className="w-full max-w-md rounded-2xl border ca-border ca-panel p-6 shadow-soft">
        <h1 className="text-lg font-semibold">Ocorreu um erro na aplicação</h1>
        <p className="mt-2 text-sm ca-muted">
          A página falhou ao carregar. Pode tentar novamente ou voltar para o login.
        </p>

        <div className="mt-5 flex gap-2">
          <button type="button" className="ca-btn" onClick={reset}>
            Tentar novamente
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border ca-border px-4 py-2 text-sm"
            onClick={() => {
              window.location.assign(loginUrl);
            }}
          >
            Ir para login
          </button>
        </div>
      </div>
    </div>
  );
}
