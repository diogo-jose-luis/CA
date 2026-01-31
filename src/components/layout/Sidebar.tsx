"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard, UsersRound, CreditCard, Truck, Home, Cctv, FileText, Settings,
  ChevronLeft, ChevronRight,
} from "lucide-react";

export type SidebarIconKey =
  | "dashboard" | "people" | "cards" | "vehicles" | "homes" | "cctv" | "reports" | "settings";

export type SidebarItem =
  | { label: string; href: string; icon: SidebarIconKey; divider?: false }
  | { divider: true; label: string };

type Props = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  items: SidebarItem[];
  activePath: string;
  appName: string;
  orgName: string;
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
};

function isActive(activePath: string, href: string) {
  if (activePath === href) return true;
  if (href !== "/" && activePath.startsWith(href + "/")) return true;
  return false;
}

export default function Sidebar({
  collapsed, items, activePath, onToggleCollapse, appName, orgName,
}: Props) {
  const width = collapsed ? "w-[84px]" : "w-[280px]";

  return (
    <aside className={`${width} shrink-0 border-r ca-border ca-panel flex flex-col`}>
      {/* Top logos area */}
      <div className="p-3">
        <div className="ca-card shadow-none p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Logo CA slot */}
              <div
                className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(135,55,70,0.14)", color: "var(--brand)" }}
                title="Logo CA"
              >
                <LayoutDashboard size={18} />
              </div>

              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-xs ca-muted">Sistema</div>
                  <div className="font-semibold leading-tight truncate">{appName}</div>
                  <div className="text-xs ca-muted truncate">{orgName}</div>
                </div>
              )}
            </div>

            <button
              className="ca-icon-btn h-10 w-10"
              type="button"
              onClick={onToggleCollapse}
              title={collapsed ? "Expandir menu" : "Colapsar menu"}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
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

      {/* Client logo slot */}
      <div className="p-3">
        <div className="ca-card shadow-none p-3">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(148,163,184,0.18)" }}
              title="Logo do Cliente"
            >
               <img
                        src="/jardim.jpg"
                        alt="Moradia"
                        className="h-full w-full object-cover rounded"
                        width={18}
                        onError={(e) =>
                          ((e.target as HTMLImageElement).src =
                            "/houses/placeholder.jpg")
                        }
                      />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs ca-muted">Condominio</div>
                <div className="text-sm font-medium truncate">Jardim das Rosas</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
