// src/app/(dashboard)/layout.tsx
"use client";

import { useTranslations } from "next-intl";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar, { SidebarItem } from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Footer from "@/components/layout/Footer";
import TabletOperatorBottomNav from "@/components/layout/TabletOperatorBottomNav";
import { useSession } from "@/contexts/AuthContext";
import useLocale from "@/hooks/useLocale";

const SIDEBAR_KEY = "ca.sidebar.collapsed";
const ORG_KEY = "ca.selected.organization";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const { data } = useSession();
  const nivel = data?.user?.nivel;

  const [collapsed, setCollapsed] = useState(false);
  const [organization, setOrganization] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const t = useTranslations("sidebar");
  const ts = (key: string, fallback: string) => (t.has(key) ? t(key) : fallback);

  const pathname = usePathname();

  // ex: "/en/dashboard" -> "en"
  const locale = useLocale();

  // helper para montar links com o locale atual
  const l = (path: string) => `/${locale}${path}`;

  // carregar organização
  useEffect(() => {
    const savedOrg = localStorage.getItem(ORG_KEY);
    if (savedOrg) {
      setOrganization(JSON.parse(savedOrg));
    } else {
      router.replace(`/${locale}/select-org`);
    }

    const savedSidebar = localStorage.getItem(SIDEBAR_KEY);
    if (savedSidebar == "1") setCollapsed(true);

    setLoaded(true);
  }, []);

  function toggleSidebar() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  }

  const items: SidebarItem[] = useMemo(() => {
    if (!organization || !nivel) return [];

    const isEmpresa = organization.tipo == "Empresa";

    const base: SidebarItem[] = [
      { label: ts("dashboard", "Dashboard"), href: l("/dashboard"), icon: "dashboard" },

      { divider: true, label: ts("sections.operator", "Operador") },

      { label: ts("peopleAccess", "Acesso de Pessoas"), href: l("/people-access"), icon: "people" },

      {
        label: ts("vehicleAccess", "Acesso de Veiculos"),
        href: l("/vehicle-access"),
        icon: "vehicles",
      },

      { label: ts("incidents", "Ocorrencias"), href: l("/ocorrencias"), icon: "alert-triangle" },
      { label: ts("orders", "Encomendas"), href: l("/encomendas"), icon: "package" },
      { label: ts("keyDelivery", "Entrega de Chaves"), href: l("/chaves"), icon: "key" },

      { label: ts("alerts", "Avisos"), href: l("/avisos"), icon: "bell" },
    ];

    if (nivel == 4) { //cliente nivel 4 
      return [
        ...base,
        { label: ts("reports", "Relatorios"), href: l("/reports"), icon: "reports" },
        {
          label: ts("serviceReview", "Avaliacao de Servicos"),
          href: l("/avaliacao-servicos"),
          icon: "star",
        },
      ];
    }

    if (nivel == 3) {//operador nivel 3
      return base;
    }

    const gestorItems: SidebarItem[] = [
      { divider: true, label: ts("sections.manager", "Gestor") },

      { label: ts("organizationMenu", "Organizacao"), href: l("/organizacao"), icon: "building2" },

      !isEmpresa && {
        label: ts("residences", "Moradias"),
        href: l("/residences"),
        icon: "homes",
      },

      { label: ts("areas", "Areas"), href: l("/departamentos"), icon: "layers" },
      { label: ts("cargos", "Cargos"), href: l("/cargos"), icon: "briefcase" },

      { label: ts("cards", "Cartoes"), href: l("/cards"), icon: "cards" },

      { label: ts("cameras", "Cameras"), href: l("/cameras"), icon: "cctv" },

      !isEmpresa && {
        label: ts("residents", "Moradores"),
        href: l("/moradores"),
        icon: "people",
      },

      { label: ts("employees", "Colaboradores"), href: l("/colaboradores"), icon: "people" },

      { label: ts("guests", "Visitantes"), href: l("/guests"), icon: "user-round" },

      { label: ts("suppliers", "Fornecedores"), href: l("/fornecedores"), icon: "factory" },

      { label: ts("clients", "Clientes"), href: l("/clientes"), icon: "briefcase" },

      { label: ts("guards", "Porteiros"), href: l("/porteiros"), icon: "shield" },
    ].filter(Boolean) as SidebarItem[];

    const adminItems: SidebarItem[] =
      nivel == 1 //admin nivel 1
        ? [
            { divider: true, label: ts("sections.admin", "Admin") },

            { label: ts("users", "Utilizadores"), href: l("/utilizadores"), icon: "user-cog" },

            { label: ts("reports", "Relatorios"), href: l("/reports"), icon: "reports" },

            { label: ts("settings", "Configuracoes"), href: l("/settings"), icon: "settings" },
          ]
        : [ //gestor nivel 2
            { divider: true, label: ts("sections.admin", "Admin") },

            { label: ts("users", "Utilizadores"), href: l("/utilizadores"), icon: "user-cog" },

            { label: ts("reports", "Relatorios"), href: l("/reports"), icon: "reports" },
          ];

    return [...base, ...gestorItems, ...adminItems];
  }, [organization, nivel, locale, t]);

  if (!loaded) return null;

  return (
    <div className="h-full flex ca-panel-alt">
      <Sidebar
        collapsed={collapsed}
        items={items}
        activePath={pathname}
        onToggleCollapse={toggleSidebar}
        appName="CA"
        organization={organization}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col tablet-app:bg-[var(--bg)]">
        <Topbar onToggleSidebar={toggleSidebar} />
        <main className="ca-scroll flex-1 overflow-y-auto tablet-app:pb-[calc(4.25rem+env(safe-area-inset-bottom))]">
          {children}
        </main>
        <div className="tablet-app:hidden">
          <Footer />
        </div>
        <TabletOperatorBottomNav />
      </div>
    </div>
  );
}
