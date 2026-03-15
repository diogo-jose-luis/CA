//app/%5Blocale%5D/%28dashboard%29/dashboard/page.tsx
"use client";

import DashboardCards from "@/components/dashboard/DashboardCards";
import { useTranslations } from "next-intl";

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">
          {t("title")}
        </h1>

        <p className="text-sm ca-muted">
          {t("subtitle")}
        </p>
      </div>

      <DashboardCards />
    </div>
  );
}