// src/components/layout/Topbar.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ui/ThemeToggle";
import {
  LogOut,
  PanelLeft,
  UserCircle2,
  Building2,
  ChevronDown,
} from "lucide-react";
import { useSession } from "@/contexts/AuthContext";
import { useTranslations } from "next-intl";
import useLocale from "@/hooks/useLocale";

export default function Topbar({
  onToggleSidebar,
}: {
  onToggleSidebar: () => void;
}) {
  const { data, signOut } = useSession();
  const user = data?.user;
  const router = useRouter();

  const t = useTranslations("topbar");

  const nivel = user?.nivel;
  const canSwitchOrg = nivel == 1 || nivel == 2;

  const [langOpen, setLangOpen] = useState(false);

  const [language, setLanguage] = useState(
    typeof window != "undefined"
      ? window.location.pathname.split("/")[1]
      : "pt",
  );

  const locale = useLocale();

  function goToSelectOrg() {
    router.push(`/${locale}/select-org`);
  }

  function changeLanguage(lang: string) {
    const path = window.location.pathname;

    const newPath = path.replace(/^\/(pt|en|fr)/, `/${lang}`);

    router.push(newPath);
  }
  return (
    <header className="flex h-14 items-center justify-between border-b ca-border ca-panel px-3 md:px-4 tablet-app:h-[3.75rem] tablet-app:px-5">
      {/* Left */}
      <div className="flex items-center gap-2 tablet-app:gap-3">
        <button
          className="ca-icon-btn tablet-app:hidden"
          onClick={onToggleSidebar}
          type="button"
          title="Menu"
        >
          <PanelLeft size={18} />
        </button>

        <div className="hidden md:block text-sm ca-muted">{t("title")}</div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Trocar Organização */}
        {canSwitchOrg && (
          <button
            className="ca-icon-btn"
            onClick={goToSelectOrg}
            title={t("switchOrg")}
          >
            <Building2 size={18} />
          </button>
        )}

        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setLangOpen((v) => !v)}
            className="flex items-center gap-1 border ca-border rounded-xl px-3 py-2 ca-panel text-sm"
          >
            {language == "pt" && "🇵🇹"}
            {language == "en" && "🇬🇧"}
            {language == "fr" && "🇫🇷"}
            <ChevronDown size={14} />
          </button>

          {langOpen && (
            <div className="absolute right-0 mt-2 w-32 ca-card p-2 shadow-xl z-50">
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

        {/* Perfil */}
        <div className="hidden sm:flex items-center gap-2 border ca-border rounded-xl px-3 py-2 ca-panel">
          <UserCircle2 size={18} className="opacity-80" />
          <span className="text-sm">{user?.name ?? t("user")}</span>
        </div>

        {/* Logout */}
        <button
          className="ca-icon-btn"
          onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
          type="button"
          title={t("logout")}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
