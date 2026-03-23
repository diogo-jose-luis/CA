"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutDashboard, UsersRound, Truck, AlertTriangle } from "lucide-react";
import useLocale from "@/hooks/useLocale";
import { useSession } from "@/contexts/AuthContext";

function pathActive(activePath: string, href: string) {
  if (activePath == href) return true;
  if (href != "/" && activePath.startsWith(href + "/")) return true;
  return false;
}

export default function TabletOperatorBottomNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("tabletNav");
  const { data } = useSession();
  const nivel = data?.user?.nivel;

  if (nivel != 3 && nivel != 5) {
    return null;
  }

  const base = `/${locale}`;

  const items = [
    { href: `${base}/dashboard`, labelKey: "home" as const, Icon: LayoutDashboard },
    { href: `${base}/people-access`, labelKey: "people" as const, Icon: UsersRound },
    { href: `${base}/vehicle-access`, labelKey: "vehicles" as const, Icon: Truck },
    { href: `${base}/ocorrencias`, labelKey: "incidents" as const, Icon: AlertTriangle },
  ];

  return (
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
          {items.map(({ href, labelKey, Icon }) => {
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
                <Icon
                  className="size-6 shrink-0"
                  strokeWidth={active ? 2.25 : 2}
                  aria-hidden
                />
                <span
                  className={`max-w-full truncate text-center text-[11px] font-medium leading-tight ${
                    active ? "text-[var(--brand)]" : "ca-muted"
                  }`}
                >
                  {t(labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
