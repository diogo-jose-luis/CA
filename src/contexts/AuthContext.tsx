"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@/types/auth";

type AuthContextValue = {
  data: Session | null;
  status: "loading" | "authenticated" | "unauthenticated";
  refetch: () => Promise<void>;
  signOut: (options?: { callbackUrl?: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Session | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      const json = await res.json();
      if (json?.session) {
        setData(json.session);
        setStatus("authenticated");
      } else {
        setData(null);
        setStatus("unauthenticated");
      }
    } catch {
      setData(null);
      setStatus("unauthenticated");
    }
  }, []);

  const signOut = useCallback(
    async (options?: { callbackUrl?: string }) => {
      await fetch("/api/auth/logout", { method: "POST" });
      setData(null);
      setStatus("unauthenticated");
      const url = options?.callbackUrl ?? "/pt/login";
      if (typeof window != "undefined") window.location.href = url;
    },
    []
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  const value: AuthContextValue = {
    data,
    status,
    refetch,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useSession must be used within AuthProvider");
  }
  return ctx;
}
