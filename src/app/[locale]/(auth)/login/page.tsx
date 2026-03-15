//app/[locale]/(auth)/login/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import axios from "axios";
import { LockKeyhole, Mail, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

const API_LOGIN = process.env.NEXT_PUBLIC_KUKAXI_API_BASE_URL_REQUEST || "http://127.0.0.1:8000/api";

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const t = useTranslations("login");

  const redirectTo = useMemo(() => sp.get("redirect") || "/dashboard", [sp]);

  const locale =
    typeof window !== "undefined"
      ? window.location.pathname.split("/")[1]
      : "pt";

  const [langOpen, setLangOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeLanguage(lang: string) {
    const newPath = pathname.replace(/^\/(pt|en|fr)/, `/${lang}`);
    router.push(newPath);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const loginRes = await axios.post(`${API_LOGIN}/login`, {
        email,
        password,
      }, { headers: { "Content-Type": "application/json" } });

      const data = loginRes.data;
      if (data?.user && data?.access_token) {
        await fetch("/api/auth/session", {
          method: "POST",
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
        router.replace(`/${locale}/post-login`);
        return;
      }
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : null;
      if (status === 401 || status === 422) {
        setError(t("errors.invalidCredentials"));
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
    <div className="min-h-screen flex">
      {/* LEFT SIDE */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white dark:bg-slate-950 px-8 relative">

        {/* Language Switch */}
        <div className="absolute top-6 right-6">
          <button
            onClick={() => setLangOpen((v) => !v)}
            className="flex items-center gap-1 border rounded-xl px-3 py-2 text-sm"
          >
            {locale === "pt" && "🇵🇹"}
            {locale === "en" && "🇬🇧"}
            {locale === "fr" && "🇫🇷"}
            <ChevronDown size={14} />
          </button>

          {langOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-900 border rounded-xl shadow-xl p-2">
              <button
                onClick={() => changeLanguage("pt")}
                className="w-full text-left px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                🇵🇹 {t("lang.pt")}
              </button>

              <button
                onClick={() => changeLanguage("en")}
                className="w-full text-left px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                🇬🇧 {t("lang.en")}
              </button>

              <button
                onClick={() => changeLanguage("fr")}
                className="w-full text-left px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                🇫🇷 {t("lang.fr")}
              </button>
            </div>
          )}
        </div>

        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-[var(--brand)]/15">
                <LockKeyhole size={22} className="text-[var(--brand)]" />
              </div>
              <div>
                <div className="font-semibold text-lg">CA</div>
                <div className="text-xs text-slate-500">
                  {t("system")}
                </div>
              </div>
            </div>

            <h1 className="text-3xl font-semibold">{t("title")}</h1>

            <p className="text-sm text-slate-500 mt-3">
              {t("subtitle")}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl p-3 border border-red-300 bg-red-50 text-sm">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-xs text-slate-500 mb-2 block">
                {t("email")}
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  className="w-full h-12 pl-12 pr-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] shadow-sm transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@condominio.com"
                  type="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-slate-500 mb-2 block">
                {t("password")}
              </label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  className="w-full h-12 pl-12 pr-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] shadow-sm transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  required
                />
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full h-12 rounded-2xl font-medium bg-[var(--brand)] text-white shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.98] transition-all"
            >
              {loading ? t("loading") : t("loginButton")}
            </button>
          </form>

          <div className="text-xs text-slate-400 mt-12">
            © {new Date().getFullYear()} CA
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="hidden lg:block lg:w-1/2 relative">
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