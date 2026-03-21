// app/[locale]/(auth)/select-org/page.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { Building2, Home, CheckCircle2, LogOut, ChevronDown } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/contexts/AuthContext";
import { useTranslations } from "next-intl";
import useLocale from "@/hooks/useLocale";
import { useAuth } from "@/hooks/useAuth";
import type { Organizacao } from "@/types/organizacao";

const STORAGE_KEY = "ca.selected.organization";
const ORG_LIST_STORAGE_KEY = "ca.organizations.list";

const TIPO_MAP: Record<number, string> = {
  1: "Empresa",
  2: "Condomínio",
  3: "Outro",
};

/** Converte Organizacao da API para o formato guardado em localStorage (nome, tipo string, logotipo). */
function orgToStored(org: Organizacao, logotipoUrl: string) {
  return {
    id: org.id,
    nome: org.designacao,
    designacao: org.designacao,
    tipo: org.tipo != null ? TIPO_MAP[org.tipo] ?? "Outro" : "Outro",
    tipoNum: org.tipo,
    logotipo: logotipoUrl,
    descricao: org.descricao ?? "",
  };
}

export default function SelectOrganizationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { data, signOut } = useSession();
  const user = data?.user;
  const { api_base_url } = useAuth();
  const locale = useLocale();
  const t = useTranslations("selectOrg");

  const [organizations, setOrganizations] = useState<Organizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [langOpen, setLangOpen] = useState(false);

  function changeLanguage(lang: string) {
    const newPath = pathname.replace(/^\/(pt|en|fr)/, `/${lang}`);
    router.push(newPath);
  }

  const buildImageUrl = useCallback(
    (org: Organizacao) => {
      const url = org.imagem_url ?? org.imagem;
      if (!url) return null;
      if (/^https?:\/\//i.test(url)) return url;
      const base = api_base_url.replace(/\/$/, "");
      const path = url.startsWith("/") ? url : `/${url}`;
      return `${base}${path}`;
    },
    [api_base_url]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORG_LIST_STORAGE_KEY);
      if (!raw) {
        setOrganizations([]);
        setLoading(false);
        return;
      }
      const parsed = JSON.parse(raw) as Organizacao[];
      setOrganizations(Array.isArray(parsed) ? parsed : []);
    } catch {
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSelect(org: Organizacao) {
    const logotipoUrl = buildImageUrl(org) ?? "";
    const stored = orgToStored(org, logotipoUrl);
    setLoadingId(org.id);

    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      router.replace(`/${locale}/dashboard`);
      router.refresh();
    }, 400);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ORG_LIST_STORAGE_KEY);
    signOut({ callbackUrl: `/${locale}/login` });
  }

  return (
    <div className="w-full max-w-6xl relative">
      <div className="absolute top-0 right-0 flex items-center gap-3 text-white">
        <span className="text-sm text-white/70 hidden sm:block">
          {user?.name ?? t("user")}
        </span>

        {/* Trocar idioma */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-3 py-2 text-sm backdrop-blur-md transition-all"
          >
            {locale == "pt" && "🇵🇹"}
            {locale == "en" && "🇬🇧"}
            {locale == "fr" && "🇫🇷"}
            <ChevronDown size={14} />
          </button>
          {langOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white/95 dark:bg-slate-900 border border-white/20 rounded-xl shadow-xl p-2 z-10">
              <button
                type="button"
                onClick={() => {
                  changeLanguage("pt");
                  setLangOpen(false);
                }}
                className="w-full text-left px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-800 dark:text-slate-200"
              >
                🇵🇹 {t("lang.pt")}
              </button>
              <button
                type="button"
                onClick={() => {
                  changeLanguage("en");
                  setLangOpen(false);
                }}
                className="w-full text-left px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-800 dark:text-slate-200"
              >
                🇬🇧 {t("lang.en")}
              </button>
              <button
                type="button"
                onClick={() => {
                  changeLanguage("fr");
                  setLangOpen(false);
                }}
                className="w-full text-left px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-800 dark:text-slate-200"
              >
                🇫🇷 {t("lang.fr")}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="
            flex items-center gap-2
            bg-white/10 hover:bg-white/20
            border border-white/20
            px-4 py-2 rounded-xl
            backdrop-blur-md
            transition-all
          "
        >
          <LogOut size={16} />
          <span className="text-sm">{t("logout")}</span>
        </button>
      </div>

      <div className="text-center mb-12 pt-12">
        <h1 className="text-3xl md:text-4xl font-semibold text-white">
          {t("title")}
        </h1>
        <p className="text-sm text-white/70 mt-3">{t("subtitle")}</p>
      </div>

      {loading ? (
        <div className="text-center text-white/70 py-12">
          {t("loading")}
        </div>
      ) : organizations.length == 0 ? (
        <div className="text-center text-white/70 py-12">
          {t("empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {organizations.map((org) => {
            const isLoading = loadingId == org.id;
            const tipoLabel =
              org.tipo != null ? TIPO_MAP[org.tipo] ?? "Outro" : "Outro";
            const logotipoUrl = buildImageUrl(org);

            return (
              <div
                key={org.id}
                onClick={() => handleSelect(org)}
                className="
                  relative group cursor-pointer
                  bg-white/10 backdrop-blur-xl
                  border border-white/20
                  rounded-3xl p-8
                  transition-all duration-300
                  hover:-translate-y-2
                  hover:bg-white/15
                  hover:shadow-2xl
                "
              >
                {isLoading && (
                  <div className="absolute inset-0 rounded-3xl bg-black/40 flex items-center justify-center">
                    <CheckCircle2
                      className="text-green-400 animate-pulse"
                      size={40}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between mb-6">
                  <div className="h-16 w-16 rounded-2xl overflow-hidden bg-white/20 flex items-center justify-center">
                    {logotipoUrl ? (
                      <img
                        src={logotipoUrl}
                        alt={org.designacao}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    ) : (
                      <Building2 size={24} className="text-white/50" />
                    )}
                  </div>
                  <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-white/15">
                    {tipoLabel == "Empresa" ? (
                      <Building2 size={18} className="text-white/80" />
                    ) : (
                      <Home size={18} className="text-white/80" />
                    )}
                  </div>
                </div>

                <h2 className="text-lg font-semibold text-white group-hover:text-[var(--brand)] transition">
                  {org.designacao}
                </h2>

                <p className="text-sm text-white/60 mt-3 leading-relaxed">
                  {org.descricao ?? "—"}
                </p>

                <div className="mt-6">
                  <span className="text-xs px-4 py-1.5 rounded-full bg-white/20 text-white tracking-wide">
                    {tipoLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center text-xs text-white/50 mt-16">
        © {new Date().getFullYear()} CA · {t("system")}
      </div>
    </div>
  );
}
