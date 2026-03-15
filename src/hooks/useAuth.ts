//src/hooks/useAuth.ts
"use client";

import axios from "axios";
import { useMemo } from "react";
import { useSession } from "@/contexts/AuthContext";

export function useAuth() {
  const { data } = useSession();
  const session = data;
  const token = session?.user?.token;
  const user = session?.user;

  const api_base_url = process.env.NEXT_PUBLIC_KUKAXI_API_BASE_URL || "http://127.0.0.1:8000";
  const api_base_url_request =
    process.env.NEXT_PUBLIC_KUKAXI_API_BASE_URL_REQUEST || "http://127.0.0.1:8000/api";

  const http = useMemo(() => {
    return axios.create({
      baseURL: api_base_url_request,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, [api_base_url_request, token]);

  return { token, user, http, api_base_url, api_base_url_request };
}
