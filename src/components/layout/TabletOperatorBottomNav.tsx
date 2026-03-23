"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ComponentType, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  ClipboardList,
  Home,
  LayoutDashboard,
  MoreHorizontal,
  Truck,
  UsersRound,
  X,
} from "lucide-react";
import useLocale from "@/hooks/useLocale";
import type { SidebarIconKey, SidebarItem } from "@/components/layout/Sidebar";

function pathActive(activePath: string, href: string) {
  if (activePath == href) return true;
  if (href != "/" && activePath.startsWith(href + "/")) return true;
  return false;
}

type Props = {
  nivel?: number;
  items: SidebarItem[];
};

type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
};

function iconFromSidebarKey(icon?: SidebarIconKey): NavItem["Icon"] {
  if (icon === "people") return UsersRound;
  if (icon === "vehicles") return Truck;
  if (icon === "bell") return Bell;
  if (icon === "clipboard-list") return ClipboardList;
  if (icon === "alert-triangle") return AlertTriangle;
  return LayoutDashboard;
}

function navItemFromHref(
  items: SidebarItem[],
  href: string,
  fallback: string,
  fallbackIcon: NavItem["Icon"]
): NavItem {
  const found = items.find((i) => "href" in i && i.href === href);
  if (found && "href" in found) {
    return {
      href,
      label: found.label,
      Icon: iconFromSidebarKey(found.icon),
    };
  }
  return { href, label: fallback, Icon: fallbackIcon };
}

export default function TabletOperatorBottomNav({ nivel, items }: Props) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("tabletNav");
  const [moreOpen, setMoreOpen] = useState(false);

  if (nivel != 3 && nivel != 5 && nivel != 6) {
    return null;
  }

  const base = `/${locale}`;
  const isSupervisor = nivel == 5;

  const primaryItems = useMemo(() => {
    if (isSupervisor) {
      return [
        navItemFromHref(items, `${base}/dashboard`, t("home"), Home),
        navItemFromHref(items, `${base}/supervisoes`, t("supervision"), ClipboardList),
        navItemFromHref(items, `${base}/people-access`, t("people"), UsersRound),
        navItemFromHref(items, `${base}/vehicle-access`, t("vehicles"), Truck),
      ];
    }
    return [
      navItemFromHref(items, `${base}/dashboard`, t("home"), Home),
      navItemFromHref(items, `${base}/people-access`, t("people"), UsersRound),
      navItemFromHref(items, `${base}/vehicle-access`, t("vehicles"), Truck),
      navItemFromHref(items, `${base}/avisos`, t("alerts"), Bell),
    ];
  }, [base, isSupervisor, items, t]);

  const primarySet = new Set(primaryItems.map((item) => item.href));
  const drawerItems = useMemo(
    () =>
      items.filter(
        (item): item is Extract<SidebarItem, { href: string }> =>
          !("divider" in item) && !primarySet.has(item.href)
      ),
    [items, primarySet]
  );

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-50 hidden tablet-app:block">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label={t("closeMore")}
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t ca-border bg-[var(--panel)] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">{t("more")}</div>
              <button type="button" className="ca-icon-btn" onClick={() => setMoreOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[50vh] space-y-1 overflow-y-auto pb-2">
              {drawerItems.map((item) => {
                const active = pathActive(pathname, item.href);
                const Icon = iconFromSidebarKey(item.icon);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm transition"
                    style={{
                      color: active ? "var(--brand)" : "var(--fg)",
                      background: active ? "rgba(135, 55, 70, 0.12)" : "transparent",
                    }}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 hidden tablet-app:block"
        aria-label={t("ariaLabel")}
      >
        <div
          className="pointer-events-auto border-t ca-border bg-[var(--panel)]/92 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.35)]"
          style={{
            paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))",
          }}
        >
          <div className="mx-auto flex h-[3.25rem] max-w-4xl items-stretch justify-around px-1 sm:px-3">
            {primaryItems.map(({ href, label, Icon }) => {
              const active = pathActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 transition-colors [-webkit-tap-highlight-color:transparent]"
                  style={{
                    color: active ? "var(--brand)" : "var(--muted)",
                  }}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="size-6 shrink-0" strokeWidth={active ? 2.25 : 2} aria-hidden />
                  <span
                    className={`max-w-full truncate text-center text-[11px] font-medium leading-tight ${
                      active ? "text-[var(--brand)]" : "ca-muted"
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 transition-colors [-webkit-tap-highlight-color:transparent]"
            >
              <MoreHorizontal className="size-6 shrink-0" aria-hidden />
              <span className="max-w-full truncate text-center text-[11px] font-medium leading-tight ca-muted">
                {t("more")}
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
