// app/[locale]/post-login/page.tsx
"use client";

import { useSession } from "@/contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useLocale from "@/hooks/useLocale";
import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";
import type { Organizacao } from "@/types/organizacao";

const ORG_KEY = "ca.selected.organization";
const ORG_LIST_STORAGE_KEY = "ca.organizations.list";
const TIPO_MAP: Record<number, string> = {
  1: "Empresa",
  2: "Condomínio",
  3: "Outro",
};

const ORG_LOAD_ERROR_FALLBACK =
  "Não foi possível carregar a sua organização. Contacte o administrador.";

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

export default function PostLogin() {
  const { data, status, refetch } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const { http, api_base_url } = useAuth();
  const t = useTranslations("selectOrg");
  const doneRef = useRef(false);
  const [orgError, setOrgError] = useState<string | null>(null);

  const getOrgErrorMessage = () => {
    try {
      const msg = t("orgLoadError");
      if (typeof msg == "string" && !msg.includes("selectOrg") && msg.length > 5)
        return msg;
    } catch {
      /* ignore */
    }
    return ORG_LOAD_ERROR_FALLBACK;
  };

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (status != "authenticated" || !data?.user || doneRef.current) return;

    const user = data.user;
    const nivel = user.nivel;

    // Apenas nível 1 (admin) e 2 (gestor) têm acesso ao select-org.
    // Operador, cliente e outros vão direto ao dashboard com a organização do user.
    if (nivel == 1 || nivel == 2) {
      let cancelled = false;
      (async () => {
        try {
          const res = await http.get<{ data: Organizacao[] }>("/organizacoes", {
            params: { estado: 1 },
          });
          if (cancelled) return;
          const list = res.data?.data ?? [];
          localStorage.setItem(ORG_LIST_STORAGE_KEY, JSON.stringify(list));
          doneRef.current = true;
          router.replace(`/${locale}/select-org`);
        } catch {
          if (!cancelled) {
            doneRef.current = true;
            setOrgError(getOrgErrorMessage());
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    const organizacaoId = user.organizacao_id ?? null;
    if (organizacaoId == null) {
      doneRef.current = true;
      setOrgError(getOrgErrorMessage());
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await http.get<{ data: Organizacao }>(
          `/organizacoes/${organizacaoId}`
        );
        if (cancelled) return;
        const org = res.data?.data;
        if (!org) {
          setOrgError(getOrgErrorMessage());
          doneRef.current = true;
          return;
        }
        const base = api_base_url.replace(/\/$/, "");
        const rawUrl = org.imagem_url ?? org.imagem;
        const logotipoUrl = rawUrl
          ? `${base}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`
          : "";
        const stored = orgToStored(org, logotipoUrl);
        localStorage.setItem(ORG_KEY, JSON.stringify(stored));
        doneRef.current = true;
        router.replace(`/${locale}/dashboard`);
      } catch {
        if (!cancelled) {
          doneRef.current = true;
          setOrgError(getOrgErrorMessage());
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, data, router, locale, http, api_base_url, t]);

  if (orgError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 px-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 dark:text-red-400">{orgError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="text-slate-500 dark:text-slate-400">
        {status == "loading" ? "A verificar sessão…" : "A redirecionar…"}
      </div>
    </div>
  );
}
