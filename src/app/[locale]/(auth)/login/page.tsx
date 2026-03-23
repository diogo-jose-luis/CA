//app/[locale]/(auth)/login/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import axios from "axios";
import { LockKeyhole, Mail, ChevronDown, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { getKukaxiApiRequestBaseUrl } from "@/lib/kukaxi-api";

const API_LOGIN = getKukaxiApiRequestBaseUrl();

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const t = useTranslations("login");

  const redirectTo = useMemo(() => sp.get("redirect") || "/dashboard", [sp]);

  const locale =
    typeof window != "undefined"
      ? window.location.pathname.split("/")[1]
      : "pt";

  const [langOpen, setLangOpen] = useState(false);

  type LoginMode = "pin" | "password";
  const [loginMode, setLoginMode] = useState<LoginMode>("pin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function digitsPin(value: string) {
    return value.replace(/\D/g, "").slice(0, 4);
  }

  function changeLanguage(lang: string) {
    const newPath = pathname.replace(/^\/(pt|en|fr)/, `/${lang}`);
    router.push(newPath);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (loginMode === "pin") {
      if (pin.length !== 4) {
        setError(t("errors.pinLength"));
        setLoading(false);
        return;
      }
    }

    const payload =
      loginMode === "pin"
        ? { email, pin }
        : { email, password };

    try {
      const loginRes = await axios.post(`${API_LOGIN}/login`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      const data = loginRes.data;
      if (data?.user && data?.access_token) {
        const sessionRes = await fetch("/api/auth/session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              cargo: data.user.cargo?.designacao ?? "",
              nivel: data.user.nivel,
              imagem: data.user.imagem ?? "",
              tipo: data.user.tipo,
              cargo_id: data.user.cargo_id,
              organizacao_id: data.user.organizacao_id ?? null,
            },
            token: data.access_token,
          }),
        });
        if (!sessionRes.ok) {
          setError(t("errors.authError"));
          return;
        }
        // Navegação completa: em WebView Android (e alguns browsers) o cookie do POST
        // pode não ir no pedido imediato a seguir a router.replace() (SPA).
        window.location.assign(`/${locale}/post-login`);
        return;
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data as
          | { message?: string; error?: string }
          | undefined;
        const serverMsg =
          typeof data?.message === "string"
            ? data.message
            : typeof data?.error === "string"
              ? data.error
              : null;
        if (serverMsg) {
          setError(serverMsg);
        } else if (status == 401 || status == 422) {
          setError(t("errors.invalidCredentials"));
        } else {
          setError(t("errors.authError"));
        }
      } else {
        setError(t("errors.authError"));
      }
      return;
    } finally {
      setLoading(false);
    }

    setError(t("errors.authError"));
    setLoading(false);
  }

  return (
    <div className="flex min-h-[100dvh] min-h-screen w-full flex-col desktop-auth:flex-row">
      {/* Painel principal: telefone = ecrã cheio branco; tablet-app = transparente (vê-se o fundo do layout); desktop = metade */}
      <div className="relative flex w-full flex-1 items-center justify-center bg-white pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] dark:bg-slate-950 tablet-app:bg-transparent desktop-auth:w-1/2 desktop-auth:bg-white">
        {/* Language Switch */}
        <div className="absolute right-[max(1.5rem,env(safe-area-inset-right))] top-[max(1.5rem,env(safe-area-inset-top))] z-20 tablet-app:right-[max(2rem,env(safe-area-inset-right))] tablet-app:top-[max(2rem,env(safe-area-inset-top))] desktop-auth:right-[max(1.5rem,env(safe-area-inset-right))] desktop-auth:top-[max(1.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={() => setLangOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90 tablet-app:min-h-12 tablet-app:px-4 tablet-app:text-base"
          >
            {locale == "pt" && "🇦🇴"}
            {locale == "en" && "🇬🇧"}
            {locale == "fr" && "🇫🇷"}
            <ChevronDown className="size-3.5 shrink-0 tablet-app:size-5" aria-hidden />
          </button>

          {langOpen && (
            <div className="absolute right-0 mt-2 w-32 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900 tablet-app:w-44 tablet-app:p-2.5">
              <button
                type="button"
                onClick={() => changeLanguage("pt")}
                className="w-full rounded-xl px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 tablet-app:min-h-12 tablet-app:px-3 tablet-app:text-base"
              >
                🇦🇴 {t("lang.pt")}
              </button>

              <button
                type="button"
                onClick={() => changeLanguage("en")}
                className="w-full rounded-xl px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 tablet-app:min-h-12 tablet-app:px-3 tablet-app:text-base"
              >
                🇬🇧 {t("lang.en")}
              </button>

              <button
                type="button"
                onClick={() => changeLanguage("fr")}
                className="w-full rounded-xl px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 tablet-app:min-h-12 tablet-app:px-3 tablet-app:text-base"
              >
                🇫🇷 {t("lang.fr")}
              </button>
            </div>
          )}
        </div>

        <div className="relative w-full max-w-md tablet-app:max-w-[26.5rem] tablet-app:rounded-[1.75rem] tablet-app:border tablet-app:border-slate-200/90 tablet-app:bg-white/95 tablet-app:p-10 tablet-app:shadow-2xl tablet-app:shadow-black/20 tablet-app:ring-1 tablet-app:ring-black/5 tablet-app:backdrop-blur-md tablet-app:dark:border-slate-700/90 tablet-app:dark:bg-slate-950/95 desktop-auth:max-w-md desktop-auth:rounded-none desktop-auth:border-0 desktop-auth:bg-transparent desktop-auth:p-0 desktop-auth:shadow-none desktop-auth:ring-0 desktop-auth:backdrop-blur-none">
          {/* Logo */}
          <div className="mb-10 tablet-app:mb-12">
            <div className="mb-8 flex items-center gap-3 tablet-app:gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand)]/15 tablet-app:h-14 tablet-app:w-14 tablet-app:rounded-[1.125rem]">
                <LockKeyhole className="size-[22px] text-[var(--brand)] tablet-app:size-7" />
              </div>
              <div>
                <div className="text-lg font-semibold tablet-app:text-xl">CA</div>
                <div className="text-xs text-slate-500 tablet-app:text-sm">
                  {t("system")}
                </div>
              </div>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight tablet-app:text-4xl">
              {t("title")}
            </h1>

            <p className="mt-3 text-sm text-slate-500 tablet-app:mt-4 tablet-app:text-base tablet-app:leading-relaxed">
              {t("subtitle")}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6 tablet-app:space-y-7">
            {error && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm tablet-app:p-4 tablet-app:text-base dark:border-red-900/50 dark:bg-red-950/40">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="mb-2 block text-xs text-slate-500 tablet-app:mb-2.5 tablet-app:text-sm">
                {t("email")}
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400 tablet-app:left-5 tablet-app:size-5" />

                <input
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--brand)] dark:border-slate-700 dark:bg-slate-900 tablet-app:h-14 tablet-app:rounded-[1.125rem] tablet-app:pl-14 tablet-app:text-lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@condominio.com"
                  type="email"
                  required
                />
              </div>
            </div>

            <div className="flex rounded-2xl border border-slate-300 bg-slate-50/80 p-1 dark:border-slate-700 dark:bg-slate-900/50 tablet-app:p-1.5">
              <button
                type="button"
                className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold transition tablet-app:py-3 tablet-app:text-sm ${
                  loginMode === "pin"
                    ? "bg-[var(--brand)] text-white shadow-md"
                    : "text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-800/80"
                }`}
                onClick={() => {
                  setLoginMode("pin");
                  setError(null);
                }}
              >
                {t("modePin")}
              </button>
              <button
                type="button"
                className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold transition tablet-app:py-3 tablet-app:text-sm ${
                  loginMode === "password"
                    ? "bg-[var(--brand)] text-white shadow-md"
                    : "text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-slate-800/80"
                }`}
                onClick={() => {
                  setLoginMode("password");
                  setError(null);
                }}
              >
                {t("modePassword")}
              </button>
            </div>

            {loginMode === "pin" ? (
              <div>
                <label className="mb-2 block text-xs text-slate-500 tablet-app:mb-2.5 tablet-app:text-sm">
                  {t("pin")}
                </label>

                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400 tablet-app:left-5 tablet-app:size-5" />

                  <input
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-center font-mono text-xl tracking-[0.4em] shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--brand)] dark:border-slate-700 dark:bg-slate-900 tablet-app:h-14 tablet-app:rounded-[1.125rem] tablet-app:pl-14 tablet-app:text-2xl"
                    value={pin}
                    onChange={(e) => setPin(digitsPin(e.target.value))}
                    placeholder="••••"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    required
                    aria-invalid={pin.length > 0 && pin.length < 4}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-xs text-slate-500 tablet-app:mb-2.5 tablet-app:text-sm">
                  {t("password")}
                </label>

                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-slate-400 tablet-app:left-5 tablet-app:size-5" />

                  <input
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[var(--brand)] dark:border-slate-700 dark:bg-slate-900 tablet-app:h-14 tablet-app:rounded-[1.125rem] tablet-app:pl-14 tablet-app:text-lg"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="h-12 w-full rounded-2xl bg-[var(--brand)] font-medium text-white shadow-md transition-all hover:scale-[1.01] hover:shadow-lg active:scale-[0.98] tablet-app:h-14 tablet-app:rounded-[1.125rem] tablet-app:text-lg disabled:opacity-70"
            >
              {loading ? t("loading") : t("loginButton")}
            </button>
          </form>

          <div className="mt-10 text-center text-xs text-slate-400 tablet-app:mt-12 tablet-app:text-sm">
            © {new Date().getFullYear()} CA
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — apenas ecrãs grandes (não tablet operador) */}
      <div className="relative hidden w-1/2 desktop-auth:block">
        <img
          src="/banners/background3.png"
          alt="Wallpaper"
          className="absolute inset-0 w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/60" />

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(135,55,70,0.45), rgba(0,0,0,0.85))",
          }}
        />

        <div className="relative z-10 h-full flex flex-col justify-end p-16 text-white">
          <h2 className="text-4xl font-semibold max-w-lg leading-tight">
            {t("bannerTitle")}
          </h2>

          <p className="text-white/70 mt-6 max-w-md">
            {t("bannerDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}