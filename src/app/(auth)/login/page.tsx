"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";

const SESSION_COOKIE = "ca_session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // TODO: substituir por API real
    document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}`;
    router.replace("/dashboard");
  }

  return (
    <div className="w-full max-w-md">
      <div className="ca-card-glass p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="h-11 w-11 rounded-2xl flex items-center justify-center"
            style={{
              background: "rgba(135,55,70,0.14)",
              color: "var(--brand)",
            }}
          >
            <LockKeyhole size={20} />
          </div>

          <div>
            <div className="text-lg font-semibold">Entrar no CA</div>
            <div className="text-sm ca-muted">Painel de Controle de Acesso</div>
          </div>
        </div>

        <form onSubmit={doLogin} className="space-y-3">
          <label className="block">
            <div className="text-xs ca-muted mb-1">E-mail</div>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60"
              />
              <input
                className="ca-input pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: admin@condominio.com"
                type="email"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="block">
            <div className="text-xs ca-muted mb-1">Senha</div>
            <div className="relative">
              <LockKeyhole
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60"
              />
              <input
                className="ca-input pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          <button
            className="ca-btn w-full mt-2"
            disabled={loading}
            type="submit"
          >
            {loading ? "A entrar..." : "Entrar"}
          </button>

         
        </form>
      </div>

      <div className="text-center text-xs ca-muted mt-4">
        © {new Date().getFullYear()} CA · Controle de Acesso
      </div>
    </div>
  );
}
