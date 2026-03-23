// src/components/layout/Topbar.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ui/ThemeToggle";
import {
  LogOut,
  PanelLeft,
  UserCircle2,
  Building2,
  ChevronDown,
  KeyRound,
} from "lucide-react";
import { useSession } from "@/contexts/AuthContext";
import { useTranslations } from "next-intl";
import useLocale from "@/hooks/useLocale";
import LogoutConfirmDialog from "@/components/layout/LogoutConfirmDialog";
import ChangePinModal from "@/components/layout/ChangePinModal";

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
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [changePinOpen, setChangePinOpen] = useState(false);
  const profileWrapRef = useRef<HTMLDivElement>(null);

  const [language, setLanguage] = useState(
    typeof window != "undefined"
      ? window.location.pathname.split("/")[1]
      : "pt",
  );

  const locale = useLocale();

  useEffect(() => {
    if (!profileOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      const el = profileWrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [profileOpen]);

  function goToSelectOrg() {
    router.push(`/${locale}/select-org`);
  }

  function changeLanguage(lang: string) {
    const path = window.location.pathname;

    const newPath = path.replace(/^\/(pt|en|fr)/, `/${lang}`);

    router.push(newPath);
  }

  async function handleConfirmLogout() {
    setLogoutLoading(true);
    try {
      await signOut({ callbackUrl: `/${locale}/login` });
    } finally {
      setLogoutLoading(false);
      setLogoutConfirmOpen(false);
    }
  }

  return (
    <>
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

          <button
            type="button"
            className="ca-icon-btn sm:hidden"
            onClick={() => setChangePinOpen(true)}
            title={t("changePin.menuItem")}
          >
            <KeyRound size={18} />
          </button>

          {/* Perfil + alterar PIN */}
          <div className="relative hidden sm:block" ref={profileWrapRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 border ca-border rounded-xl px-3 py-2 ca-panel text-left transition hover:opacity-95"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              <UserCircle2 size={18} className="opacity-80 shrink-0" />
              <span className="text-sm max-w-[10rem] truncate">{user?.name ?? t("user")}</span>
              <ChevronDown size={14} className="shrink-0 opacity-70" />
            </button>

            {profileOpen ? (
              <div
                className="absolute right-0 mt-2 min-w-[12rem] ca-card py-1 shadow-xl z-50 border ca-border"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => {
                    setProfileOpen(false);
                    setChangePinOpen(true);
                  }}
                >
                  <KeyRound size={16} className="opacity-80" />
                  {t("changePin.menuItem")}
                </button>
              </div>
            ) : null}
          </div>

          {/* Logout */}
          <button
            className="ca-icon-btn"
            onClick={() => setLogoutConfirmOpen(true)}
            type="button"
            title={t("logout")}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => {
          if (!logoutLoading) setLogoutConfirmOpen(false);
        }}
        onConfirm={handleConfirmLogout}
        loading={logoutLoading}
      />

      <ChangePinModal open={changePinOpen} onClose={() => setChangePinOpen(false)} />
    </>
  );
}
