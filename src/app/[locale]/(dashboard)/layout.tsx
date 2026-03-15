// src/app/(dashboard)/layout.tsx
"use client";

import { useTranslations } from "next-intl";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar, { SidebarItem } from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Footer from "@/components/layout/Footer";
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
      { label: t("dashboard"), href: l("/dashboard"), icon: "dashboard" },

      { divider: true, label: t("sections.operator") },

      { label: t("peopleAccess"), href: l("/people-access"), icon: "people" },

      {
        label: t("vehicleAccess"),
        href: l("/vehicle-access"),
        icon: "vehicles",
      },

      { label: t("incidents"), href: l("/ocorrencias"), icon: "reports" },//nova
      { label: t("orders"), href: l("/encomendas"), icon: "reports" },//nova
      { label: t("keyDelivery"), href: l("/chaves"), icon: "reports" },//nova

      { label: t("alerts"), href: l("/avisos"), icon: "reports" },
    ];

    if (nivel == 4) {
      return [
        ...base,
        { label: t("reports"), href: l("/reports"), icon: "reports" },
        {
          label: t("serviceReview"),
          href: l("/avaliacao-servicos"),
          icon: "reports",
        },//nova
      ];
    }

    if (nivel == 3) {
      return base;
    }

    const gestorItems: SidebarItem[] = [
      { divider: true, label: t("sections.manager") },

      { label: t("organizationMenu"), href: l("/organizacao"), icon: "homes" },

      !isEmpresa && {
        label: t("residences"),
        href: l("/residences"),
        icon: "homes",
      },

      { label: t("areas"), href: l("/departamentos"), icon: "tag" },

      { label: t("cards"), href: l("/cards"), icon: "cards" },

      { label: t("cameras"), href: l("/cameras"), icon: "cctv" },

      !isEmpresa && {
        label: t("residents"),
        href: l("/moradores"),
        icon: "people",
      },

      { label: t("employees"), href: l("/colaboradores"), icon: "people" },

      { label: t("guests"), href: l("/guests"), icon: "user-x" },

      { label: t("suppliers"), href: l("/fornecedores"), icon: "buildings" },

      { label: t("clients"), href: l("/clientes"), icon: "buildings" },

      { label: t("guards"), href: l("/porteiros"), icon: "shield" },
    ].filter(Boolean) as SidebarItem[];

    const adminItems: SidebarItem[] =
      nivel == 1
        ? [
            { divider: true, label: t("sections.admin") },

            { label: t("users"), href: l("/utilizadores"), icon: "user-cog" },

            { label: t("reports"), href: l("/reports"), icon: "reports" },

            { label: t("settings"), href: l("/settings"), icon: "settings" },
          ]
        : [
            { divider: true, label: t("sections.admin") },

            { label: t("users"), href: l("/utilizadores"), icon: "user-cog" },

            { label: t("reports"), href: l("/reports"), icon: "reports" },
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

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto ca-scroll">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
