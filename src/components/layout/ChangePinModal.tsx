"use client";

import { useState } from "react";
import axios from "axios";
import { useTranslations } from "next-intl";
import { KeyRound, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  open: boolean;
  onClose: () => void;
};

type VerifyMode = "pin" | "password";

function digitsOnly(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

export default function ChangePinModal({ open, onClose }: Props) {
  const t = useTranslations("topbar.changePin");
  const { http } = useAuth();

  const [verifyMode, setVerifyMode] = useState<VerifyMode>("pin");
  const [oldPin, setOldPin] = useState("");
  const [password, setPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function reset() {
    setVerifyMode("pin");
    setOldPin("");
    setPassword("");
    setNewPin("");
    setConfirmPin("");
    setError(null);
    setSuccess(false);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPin.length !== 4 || confirmPin.length !== 4) {
      setError(t("pinLength"));
      return;
    }
    if (newPin !== confirmPin) {
      setError(t("pinMismatch"));
      return;
    }
    if (verifyMode === "pin" && oldPin.length !== 4) {
      setError(t("oldPinLength"));
      return;
    }
    if (verifyMode === "password" && !password) {
      setError(t("passwordRequired"));
      return;
    }

    const body =
      verifyMode === "pin"
        ? {
            old_pin: oldPin,
            new_pin: newPin,
            new_pin_confirmation: confirmPin,
          }
        : {
            password,
            new_pin: newPin,
            new_pin_confirmation: confirmPin,
          };

    setSubmitting(true);
    try {
      await http.post("/alterar-pin", body);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1600);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string } | undefined;
        const msg = data?.message;
        setError(typeof msg === "string" && msg ? msg : t("error"));
      } else {
        setError(t("error"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[2px] sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) handleClose();
      }}
    >
      <div
        className="ca-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border ca-border p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-pin-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand)]/15 text-[var(--brand)]">
              <KeyRound className="size-5" aria-hidden />
            </div>
            <h2 id="change-pin-title" className="text-lg font-semibold">
              {t("title")}
            </h2>
          </div>
          <button
            type="button"
            className="ca-icon-btn shrink-0"
            onClick={handleClose}
            disabled={submitting}
            aria-label={t("close")}
          >
            <X className="size-4" />
          </button>
        </div>

        {success ? (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
            {t("success")}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error ? (
              <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm dark:border-red-900/50 dark:bg-red-950/40">
                {error}
              </div>
            ) : null}

            <div className="flex rounded-xl border ca-border p-1 ca-panel">
              <button
                type="button"
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm ${
                  verifyMode === "pin"
                    ? "bg-[var(--brand)] text-white shadow-sm"
                    : "ca-muted hover:opacity-90"
                }`}
                onClick={() => {
                  setVerifyMode("pin");
                  setError(null);
                }}
              >
                {t("verificationByPin")}
              </button>
              <button
                type="button"
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm ${
                  verifyMode === "password"
                    ? "bg-[var(--brand)] text-white shadow-sm"
                    : "ca-muted hover:opacity-90"
                }`}
                onClick={() => {
                  setVerifyMode("password");
                  setError(null);
                }}
              >
                {t("verificationByPassword")}
              </button>
            </div>

            {verifyMode === "pin" ? (
              <div>
                <label className="mb-1.5 block text-xs ca-muted">{t("oldPin")}</label>
                <input
                  className="ca-input w-full tracking-[0.35em] font-mono text-center text-lg"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  value={oldPin}
                  onChange={(e) => setOldPin(digitsOnly(e.target.value, 4))}
                  placeholder={t("pinPlaceholder")}
                />
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs ca-muted">{t("currentPassword")}</label>
                <input
                  className="ca-input w-full"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs ca-muted">{t("newPin")}</label>
              <input
                className="ca-input w-full tracking-[0.35em] font-mono text-center text-lg"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(digitsOnly(e.target.value, 4))}
                placeholder={t("pinPlaceholder")}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs ca-muted">{t("confirmNewPin")}</label>
              <input
                className="ca-input w-full tracking-[0.35em] font-mono text-center text-lg"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(digitsOnly(e.target.value, 4))}
                placeholder={t("pinPlaceholder")}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="h-11 rounded-xl border ca-border ca-panel px-4 text-sm font-medium sm:h-10"
                onClick={handleClose}
                disabled={submitting}
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                className="h-11 rounded-xl bg-[var(--brand)] px-4 text-sm font-medium text-white shadow-md disabled:opacity-60 sm:h-10"
                disabled={submitting}
              >
                {submitting ? t("saving") : t("save")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
