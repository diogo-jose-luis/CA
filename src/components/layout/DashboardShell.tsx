"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar, { SidebarItem } from "./Sidebar";
import Topbar from "./Topbar";
import Footer from "./Footer";

const STORAGE_KEY = "ca.sidebar.collapsed";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "1") setCollapsed(true);
  }, []);

  function toggleSidebar() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const items: SidebarItem[] = useMemo(
    () => [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
      { label: "Acesso de Pessoas", href: "/people-access", icon: "people" },
      { label: "Cartões", href: "/cards", icon: "cards" },
      { label: "Acesso de Veículos", href: "/vehicle-access", icon: "vehicles" },
      { label: "Moradias", href: "/residences", icon: "homes" },
      { label: "Câmeras", href: "/cameras", icon: "cctv" },
      { label: "Avisos", href: "/avisos", icon: "reports" },
      { divider: true, label: "Admin" },
      { label: "Relatórios", href: "/reports", icon: "reports" },
      { label: "Configurações", href: "/settings", icon: "settings" },
    ],
    []
  );

  return (
    <div className="h-full flex ca-panel-alt">
      <Sidebar
        collapsed={collapsed}
        items={items}
        activePath={pathname}
        onToggleCollapse={toggleSidebar}
        appName="CA"
        orgName="Condomínio / Indústria"
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onToggleSidebar={toggleSidebar} userName="Admin" />
        <main className="flex-1 overflow-y-auto ca-scroll">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
