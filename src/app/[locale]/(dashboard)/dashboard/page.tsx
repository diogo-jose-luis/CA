//app/%5Blocale%5D/%28dashboard%29/dashboard/page.tsx
"use client";

import DashboardCards, {
  type DashboardPeriod,
} from "@/components/dashboard/DashboardCards";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type FormEvent } from "react";

const ORG_KEY = "ca.selected.organization";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  const defaultRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 7);
    return { from: toLocalInputValue(from), to: toLocalInputValue(to) };
  }, []);

  const [fromStr, setFromStr] = useState(defaultRange.from);
  const [toStr, setToStr] = useState(defaultRange.to);
  const [period, setPeriod] = useState<DashboardPeriod>(() => ({
    from: new Date(defaultRange.from),
    to: new Date(defaultRange.to),
  }));

  const [organizacaoId, setOrganizacaoId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ORG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { id?: number | string };
      const id = typeof parsed?.id == "number" ? parsed.id : Number(parsed?.id);
      if (Number.isFinite(id) && id > 0) setOrganizacaoId(id);
    } catch {
      // noop
    }
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      return;
    }
    setPeriod({ from, to });
  }

  return (
    <div className="p-4 md:p-6 tablet-app:min-h-0 tablet-app:bg-[var(--panel-2)] tablet-app:p-5 tablet-app:pt-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between tablet-app:mb-8 tablet-app:gap-5">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold md:text-2xl tablet-app:text-3xl tablet-app:tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm ca-muted tablet-app:mt-2 tablet-app:text-base tablet-app:leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end lg:shrink-0 lg:justify-end tablet-app:rounded-2xl tablet-app:border ca-border tablet-app:bg-[var(--panel)] tablet-app:p-4 tablet-app:shadow-sm"
        >
          <div className="w-full space-y-1 sm:w-auto sm:min-w-[200px]">
            <label htmlFor="dash-period-from" className="block text-xs ca-muted tablet-app:text-sm">
              {t("periodFrom")}
            </label>
            <input
              id="dash-period-from"
              type="datetime-local"
              className="ca-input w-full tablet-app:min-h-12 tablet-app:rounded-xl tablet-app:px-3 tablet-app:text-base"
              value={fromStr}
              onChange={(e) => setFromStr(e.target.value)}
              required
            />
          </div>
          <div className="w-full space-y-1 sm:w-auto sm:min-w-[200px]">
            <label htmlFor="dash-period-to" className="block text-xs ca-muted tablet-app:text-sm">
              {t("periodTo")}
            </label>
            <input
              id="dash-period-to"
              type="datetime-local"
              className="ca-input w-full tablet-app:min-h-12 tablet-app:rounded-xl tablet-app:px-3 tablet-app:text-base"
              value={toStr}
              onChange={(e) => setToStr(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="ca-btn w-full shrink-0 sm:w-auto tablet-app:min-h-12 tablet-app:rounded-xl tablet-app:px-6 tablet-app:text-base"
          >
            {t("applyPeriod")}
          </button>
        </form>
      </div>

      <DashboardCards organizacaoId={organizacaoId} period={period} />
    </div>
  );
}
