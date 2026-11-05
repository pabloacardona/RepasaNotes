"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Spinner } from "@/components/ui";

type Mode = "fixed" | "variant";

export function ShareButton({ quizId, canVariant }: { quizId: string; canVariant: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Mode | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("fixed");
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: "#2a2012", light: "#ffffff" } }).then(setQr, () => setQr(null));
  }, [url]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function create(m: Mode) {
    setBusy(m);
    setError(null);
    setQr(null);
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId, mode: m }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    setBusy(null);
    if (!res || !res.ok || !data?.path) return setError(data?.error ?? "No se pudo crear el enlace. Intenta de nuevo.");
    setMode(m);
    setUrl(`${window.location.origin}${data.path}`);
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("No se pudo copiar. Selecciona el enlace y cópialo a mano.");
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="hx-btn w-full">
        🔗 Compartir este quiz
      </button>
      {open && (
        <div className="hx anim-fade-in fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/65 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="hx-epic pop-in my-auto w-full max-w-md p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h2 id="share-title" className="font-display text-xl font-bold sm:text-2xl">
                Compartir quiz
              </h2>
              <button onClick={() => setOpen(false)} aria-label="Cerrar" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--line-strong)]">
                ✕
              </button>
            </div>

            {!url ? (
              <div className="mt-4 space-y-3">
                <p className="hx-mute text-sm">Cualquiera con el enlace o el QR puede jugarlo, sin cuenta. Elige cómo:</p>
                <button onClick={() => create("fixed")} disabled={busy !== null} className="hx-btn w-full flex-col !items-start !gap-1 !p-3 text-left">
                  <span className="font-bold">{busy === "fixed" && <Spinner />} Mismo quiz para todos</span>
                  <span className="hx-mute text-xs font-normal">Las mismas preguntas; el orden de preguntas y respuestas se mezcla por persona.</span>
                </button>
                <button onClick={() => create("variant")} disabled={busy !== null || !canVariant} className="hx-btn w-full flex-col !items-start !gap-1 !p-3 text-left">
                  <span className="font-bold">{busy === "variant" && <Spinner />} Un quiz distinto para cada persona</span>
                  <span className="hx-mute text-xs font-normal">
                    {canVariant ? "La IA redacta preguntas nuevas del mismo apunte para cada visitante. Tarda unos segundos en cargar." : "No disponible: el apunte de este quiz ya no existe."}
                  </span>
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-center">
                <p className="hx-mute text-xs font-bold uppercase tracking-widest">{mode === "fixed" ? "Mismo quiz para todos" : "Quiz distinto por persona"}</p>
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="Código QR del quiz" width={220} height={220} className="mx-auto h-auto w-[min(220px,60vw)] rounded-xl bg-white p-2" />
                ) : (
                  <div className="mx-auto grid h-[220px] w-[220px] place-items-center">
                    <Spinner />
                  </div>
                )}
                <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace del quiz" className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-2 text-center text-sm" />
                <div className="flex flex-wrap justify-center gap-2">
                  <button onClick={copy} className="hx-btn hx-btn-gold !px-4">
                    {copied ? "¡Copiado!" : "Copiar enlace"}
                  </button>
                  {qr && (
                    <a href={qr} download="quiz-qr.png" className="hx-btn !px-4">
                      Descargar QR
                    </a>
                  )}
                </div>
                <button onClick={() => setUrl(null)} className="hx-mute text-sm underline-offset-4 hover:underline">
                  Crear otro enlace
                </button>
              </div>
            )}
            {error && (
              <p role="alert" className="mt-3 rounded-lg border-l-4 border-[var(--bad)] bg-[var(--bad)]/10 px-3 py-2 text-sm font-bold text-[var(--bad)]">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
