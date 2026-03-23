//src/hooks/useAuth.ts
"use client";

import axios from "axios";
import { useEffect, useMemo } from "react";
import { useSession } from "@/contexts/AuthContext";
import {
  getKukaxiPublicBaseUrl,
  resolveApiClientBase,
} from "@/lib/kukaxi-api";

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
    if (process.env.NODE_ENV !== "development") return;
    const mode = viaProxy ? "proxy (/api/backend)" : "direto (API externa)";
    console.info(`[auth] modo HTTP: ${mode} | baseURL: ${api_base_url_request}`);
  }, [api_base_url_request, viaProxy]);

  return { token, user, http, api_base_url, api_base_url_request };
}
