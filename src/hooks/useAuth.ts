//src/hooks/useAuth.ts
"use client";

import axios from "axios";
import { useEffect, useMemo } from "react";
import { useSession } from "@/contexts/AuthContext";
import {
  getKukaxiPublicBaseUrl,
  resolveApiClientBase,
} from "@/lib/kukaxi-api";

function getLocaleFromPathname(pathname: string): string {
  const match = pathname.match(/^\/(pt|en|fr)(\/|$)/);
  return match?.[1] ?? "pt";
}

function shouldForceLoginFromAuthError(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 419) return true;
  if (status !== 401) return false;

  const data = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
  const raw = `${data?.message ?? ""} ${data?.error ?? ""}`.toLowerCase();

  // Só forçar login quando o 401 indica autenticação inválida/expirada.
  return (
    raw.includes("unauthenticated") ||
    raw.includes("não autenticado") ||
    raw.includes("nao autenticado") ||
    raw.includes("token") ||
    raw.includes("expired") ||
    raw.includes("expirad") ||
    raw.includes("jwt")
  );
}

export function useAuth() {
  const { data } = useSession();
  const session = data;
  const token = session?.user?.token;
  const user = session?.user;

  const api_base_url = getKukaxiPublicBaseUrl();
  const { base: api_base_url_request, viaProxy } = useMemo(
    () => resolveApiClientBase(),
    []
  );

  const http = useMemo(() => {
    return axios.create({
      baseURL: api_base_url_request,
      withCredentials: viaProxy,
      headers: {
        "Content-Type": "application/json",
        ...(!viaProxy && token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, [api_base_url_request, viaProxy, token]);

  useEffect(() => {
    const interceptorId = http.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (shouldForceLoginFromAuthError(error)) {
          if (typeof window !== "undefined") {
            const state = window as Window & { __caAuthRedirecting?: boolean };
            if (!state.__caAuthRedirecting) {
              state.__caAuthRedirecting = true;
              try {
                await fetch("/api/auth/logout", { method: "POST" });
              } catch {
                /* ignore */
              }
              const locale = getLocaleFromPathname(window.location.pathname);
              window.location.assign(`/${locale}/login?expired=1`);
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      http.interceptors.response.eject(interceptorId);
    };
  }, [http]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const mode = viaProxy ? "proxy (/api/backend)" : "direto (API externa)";
    console.info(`[auth] modo HTTP: ${mode} | baseURL: ${api_base_url_request}`);
  }, [api_base_url_request, viaProxy]);

  return { token, user, http, api_base_url, api_base_url_request };
}
