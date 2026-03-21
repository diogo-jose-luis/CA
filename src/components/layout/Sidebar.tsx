// src/components/layout/Sidebar.tsx
"use client";

import { useTranslations } from "next-intl";
import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  UsersRound,
  CreditCard,
  Truck,
  Home,
  Cctv,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  UserCog,
  Users,
  User,
  UserPlus,
  UserCheck,
  UserX,
  UserMinus,
  UserRound,
  Mail,
  AlertTriangle,
  Package,
  Key,
  Bell,
  Star,
  Building2,
  Layers,
  Factory,
  Briefcase,
} from "lucide-react";

export type SidebarIconKey =
  | "dashboard"
  | "people"
  | "cards"
  | "vehicles"
  | "homes"
  | "cctv"
  | "reports"
  | "settings"
  | "shield"
  | "users"
  | "user"
  | "user-cog"
  | "user-plus"
  | "user-check"
  | "user-x"
  | "user-minus"
  | "square"
  | "file"
  | "folder"
  | "tag"
  | "tags"
  | "calendar"
  | "clock"
  | "mail"
  | "message-circle"
  | "building"
  | "buildings"
  | "alert-triangle"
  | "package"
  | "key"
  | "bell"
  | "star"
  | "building2"
  | "layers"
  | "factory"
  | "briefcase"
  | "user-round";

export type SidebarItem =
  | { label: string; href: string; icon: SidebarIconKey; divider?: false }
  | { divider: true; label: string };

type Props = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  items: SidebarItem[];
  activePath: string;
  appName: string;
  organization: any;
};

const iconMap: Record<SidebarIconKey, React.ElementType> = {
  dashboard: LayoutDashboard,
  people: UsersRound,
  cards: CreditCard,
  vehicles: Truck,
  homes: Home,
  cctv: Cctv,
  reports: FileText,
  settings: Settings,
  shield: Shield,
  users: Users,
  user: User,
  "user-cog": UserCog,
  "user-plus": UserPlus,
  "user-check": UserCheck,
  "user-x": UserX,
  "user-minus": UserMinus,
  square: () => <div className="h-4 w-4 bg-current rounded-sm" />,
  file: () => <div className="h-4 w-3 bg-current rounded-sm" />,
  folder: () => (
    <div className="h-3 w-4 bg-current rounded-sm relative">
      <div className="h-2 w-3 bg-current rounded-sm absolute -top-1 -left-1" />
    </div>
  ),
  tag: () => <div className="h-3 w-3 bg-current rounded-sm rotate-45" />,
  tags: () => (
    <div className="h-3 w-3 bg-current rounded-sm rotate-45 relative">
      <div className="h-3 w-3 bg-current rounded-sm rotate-45 absolute -top-1 -left-1" />
    </div>
  ),
  calendar: () => (
    <div className="h-4 w-3 bg-current rounded-sm relative">
      <div className="h-1 w-full bg-current rounded-sm absolute top-0" />
      <div className="h-1 w-full bg-current rounded-sm absolute bottom-0" />
    </div>
  ),
  clock: () => (
    <div className="h-4 w-4 rounded-full border-2 border-current relative">
      <div className="h-1 w-1 bg-current rounded-sm absolute top-1 left-1" />
      <div className="h-1 w-1 bg-current rounded-sm absolute top-1 right-1" />
    </div>
  ),
  mail: Mail,
  "message-circle": () => (
    <div className="h-4 w-4 bg-current rounded-sm relative">
      <div className="h-3 w-4 bg-current rounded-sm absolute top-0" />
      <div className="h-2 w-3 bg-current rounded-sm absolute bottom-0 left-0" />
    </div>
  ),
  building: () => (
    <div className="h-4 w-4 bg-current rounded-sm relative">
      <div className="h-3 w-2 bg-current rounded-sm absolute top-0 left-0" />
    </div>
  ),
  buildings: () => (
    <div className="h-4 w-4 bg-current rounded-sm relative">
      <div className="h-3 w-2 bg-current rounded-sm absolute top-0 left-0" />
      <div className="h-3 w-2 bg-current rounded-sm absolute top-0 right-0" />
    </div>
  ),
  "alert-triangle": AlertTriangle,
  package: Package,
  key: Key,
  bell: Bell,
  star: Star,
  building2: Building2,
  layers: Layers,
  factory: Factory,
  briefcase: Briefcase,
  "user-round": UserRound,
};

function isActive(activePath: string, href: string) {
  if (activePath == href) return true;
  if (href != "/" && activePath.startsWith(href + "/")) return true;
  return false;
}

export default function Sidebar({
  collapsed,
  items,
  activePath,
  onToggleCollapse,
  appName,
  organization,
}: Props) {
  const width = collapsed ? "w-[84px]" : "w-[280px]";

  const t = useTranslations("sidebar");

  return (
    <aside
      className={`${width} shrink-0 border-r ca-border ca-panel flex flex-col tablet-app:hidden`}
    >
      {/* Top logos area */}
      <div className="p-3">
        <div className="ca-card shadow-none p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Logo CA slot */}
              <div
                className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(135,55,70,0.14)",
                  color: "var(--brand)",
                }}
                title="Logo CA"
              >
                <LayoutDashboard size={18} />
              </div>

              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-xs ca-muted">{t("system")}</div>
                  <div className="font-semibold leading-tight truncate">
                    {appName}
                  </div>
                </div>
              )}
            </div>

            <button
              className="ca-icon-btn h-10 w-10"
              type="button"
              onClick={onToggleCollapse}
              title={collapsed ? t("expandMenu") : t("collapseMenu")}
            >
              {collapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="px-3 pb-3 flex-1 overflow-y-auto ca-scroll">
        <div className="space-y-1">
          {items.map((item, idx) => {
            if ("divider" in item && item.divider) {
              return (
                <div key={`div-${idx}`} className="pt-4 pb-2">
                  {!collapsed && (
                    <div className="px-2 text-[11px] uppercase tracking-wider ca-muted">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            }

            const Icon = iconMap[item.icon];
            const active = isActive(activePath, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className="ca-sidebar-link"
                data-active={active ? "true" : "false"}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Organização selecionada */}
      <div className="p-3">
        <div className="ca-card shadow-none p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700">
              <img
                src={organization?.logotipo || "/houses/placeholder.jpg"}
                className="h-full w-full object-cover"
              />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs ca-muted">{t("organization")}</div>
                <div className="text-sm font-medium truncate">
                  {organization?.tipo} : {organization?.nome}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
