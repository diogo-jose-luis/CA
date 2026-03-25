"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Chamado após captura bem-sucedida; o modal fecha em seguida. */
  onCapture: (file: File) => void;
};

export default function CameraCaptureModal({ open, onClose, onCapture }: Props) {
  const t = useTranslations("cameraCapture");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const handleClose = useCallback(() => {
    stopStream();
    setErr(null);
    onClose();
  }, [onClose, stopStream]);

  useEffect(() => {
    if (!open) {
      stopStream();
      setErr(null);
      return;
    }

    let cancelled = false;
    setErr(null);
    setReady(false);

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setErr(t("notSupported"));
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const el = videoRef.current;
        if (el) {
          el.srcObject = stream;
          await el.play().catch(() => {});
          setReady(el.videoWidth > 0 && el.videoHeight > 0);
        }
      } catch {
        if (!cancelled) setErr(t("noCamera"));
      }
    }

    void start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, stopStream, t]);

  const onVideoLoaded = useCallback(() => {
    const el = videoRef.current;
    if (el && el.videoWidth > 0) setReady(true);
  }, []);

  /** Garante que há pelo menos um frame de vídeo antes de desenhar no canvas (evita JPEG em branco em tablets / alguns browsers). */
  const waitForPaintableFrame = useCallback((video: HTMLVideoElement) => {
    return new Promise<void>((resolve) => {
      const rvf = (
        video as HTMLVideoElement & {
          requestVideoFrameCallback?: (cb: () => void) => void;
        }
      ).requestVideoFrameCallback;
      if (typeof rvf === "function") {
        rvf.call(video, () => resolve());
        return;
      }
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }, []);

  const finishCaptureFromCanvas = useCallback(
    (canvas: HTMLCanvasElement) => {
      canvas.toBlob(
        (blob) => {
          const deliver = (b: Blob) => {
            stopStream();
            const file = new File([b], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
            onCapture(file);
            onClose();
          };
          if (blob) {
            try {
              deliver(blob);
            } finally {
              setCapturing(false);
            }
            return;
          }
          try {
            const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
            const comma = dataUrl.indexOf(",");
            if (comma < 0) return;
            const byteString = atob(dataUrl.slice(comma + 1));
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            deliver(new Blob([ab], { type: "image/jpeg" }));
          } catch {
            /* ignore */
          } finally {
            setCapturing(false);
          }
        },
        "image/jpeg",
        0.92,
      );
    },
    [onCapture, onClose, stopStream],
  );

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) return;
    setCapturing(true);
    try {
      await video.play().catch(() => {});
      await waitForPaintableFrame(video);
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setCapturing(false);
        return;
      }
      ctx.drawImage(video, 0, 0);
      finishCaptureFromCanvas(canvas);
    } catch {
      setCapturing(false);
    }
  }, [finishCaptureFromCanvas, waitForPaintableFrame]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[140] flex flex-col bg-black/80">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3 text-white">
        <div className="min-w-0">
          <h2 className="text-base font-semibold truncate">{t("title")}</h2>
          <p className="text-xs text-white/70 truncate">{t("hint")}</p>
        </div>
        <button
          type="button"
          className="rounded-xl p-2 hover:bg-white/10 shrink-0"
          aria-label={t("cancel")}
          onClick={handleClose}
        >
          <X className="size-6" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center p-2">
        {err ? (
          <p className="text-center text-sm text-red-200 px-4">{err}</p>
        ) : (
          <video
            ref={videoRef}
            className="max-h-full max-w-full rounded-xl bg-black object-contain"
            playsInline
            muted
            autoPlay
            onLoadedMetadata={onVideoLoaded}
            onCanPlay={onVideoLoaded}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          className="rounded-xl border border-white/30 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
          onClick={handleClose}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          disabled={!!err || !ready || capturing}
          className="ca-btn flex items-center gap-2 px-6 py-3 disabled:opacity-50"
          onClick={() => void handleCapture()}
        >
          {capturing ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
          {t("capture")}
        </button>
      </div>
    </div>
  );
}
