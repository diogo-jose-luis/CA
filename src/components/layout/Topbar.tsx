"use client";

import React from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { LogOut, PanelLeft, UserCircle2 } from "lucide-react";

const SESSION_COOKIE = "ca_session";

export default function Topbar({
  onToggleSidebar,
  userName,
}: {
  onToggleSidebar: () => void;
  userName: string;
}) {
  const router = useRouter();

  function logout() {
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
    router.replace("/login");
  }

  return (
    <header className="h-14 border-b ca-border ca-panel flex items-center justify-between px-3 md:px-4">
      <div className="flex items-center gap-2">
        <button className="ca-icon-btn" onClick={onToggleSidebar} type="button" title="Menu">
          <PanelLeft size={18} />
        </button>

        <div className="hidden md:block text-sm ca-muted">
          Painel de Gestão · Controle de Acesso
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <div className="hidden sm:flex items-center gap-2 border ca-border rounded-xl px-3 py-2 ca-panel">
          <UserCircle2 size={18} className="opacity-80" />
          <span className="text-sm">Stiviandra Oliveira</span>
        </div>

        <button className="ca-icon-btn" onClick={logout} type="button" title="Sair">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
