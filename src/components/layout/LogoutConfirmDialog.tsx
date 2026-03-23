"use client";

import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

export default function LogoutConfirmDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
}: Props) {
  const t = useTranslations("topbar.logoutConfirm");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[2px] sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ca-card w-full max-w-md overflow-hidden rounded-2xl border ca-border p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand)]/15 text-[var(--brand)]">
          <LogOut className="size-6" aria-hidden />
        </div>
        <h2 id="logout-confirm-title" className="text-lg font-semibold tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-2 text-sm ca-muted leading-relaxed">{t("description")}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="h-11 rounded-xl border ca-border ca-panel px-4 text-sm font-medium transition hover:opacity-90 sm:h-10"
            onClick={onClose}
            disabled={loading}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="h-11 rounded-xl bg-[var(--brand)] px-4 text-sm font-medium text-white shadow-md transition hover:opacity-95 disabled:opacity-60 sm:h-10"
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? t("confirming") : t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
