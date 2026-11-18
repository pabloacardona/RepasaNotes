"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { Spinner } from "@/components/ui";

type Mode = "fixed" | "variant";
type Shared = { url: string; plays: number; qr: string | null };

const QR_OPTIONS = { margin: 2, errorCorrectionLevel: "M" as const, color: { dark: "#1d1826", light: "#ffffff" } };

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, "")}…`;
  }
  return lines;
}

// The QR as a ready-to-print card: header, quiz title, big QR and a hint. Drawn on a canvas so it downloads as one PNG.
async function makeCard(title: string, topic: string | null, qrDataUrl: string) {
  const img = new Image();
  img.src = qrDataUrl;
  await img.decode();
  const W = 960;
  const H = 1320;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const band = ctx.createLinearGradient(0, 0, W, 0);
  band.addColorStop(0, "#1d1826");
  band.addColorStop(1, "#4a3a1f");
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, W, 150);
  ctx.textAlign = "center";
  ctx.fillStyle = "#f0c85a";
  ctx.font = "700 60px Georgia, 'Times New Roman', serif";
  ctx.fillText("Repasa", W / 2, 96);
  ctx.fillStyle = "#1d1826";
  ctx.font = "700 56px Georgia, 'Times New Roman', serif";
  const lines = wrap(ctx, title, W - 140, 2);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 245 + i * 66));
  let cursor = 245 + (lines.length - 1) * 66; // baseline of the last title line
  if (topic) {
    cursor += 58;
    ctx.fillStyle = "#7a6a52";
    ctx.font = "600 30px system-ui, sans-serif";
    ctx.fillText(topic.toUpperCase(), W / 2, cursor);
  }
  const size = 760;
  const y = cursor + 62;
  ctx.strokeStyle = "#e0b550";
  ctx.lineWidth = 8;
  ctx.strokeRect((W - size) / 2 - 14, y - 14, size + 28, size + 28);
  ctx.drawImage(img, (W - size) / 2, y, size, size);
  ctx.fillStyle = "#1d1826";
  ctx.font = "700 44px system-ui, sans-serif";
  ctx.fillText("Escanea con la cámara para jugar", W / 2, y + size + 90);
  ctx.fillStyle = "#7a6a52";
  ctx.font = "500 30px system-ui, sans-serif";
  ctx.fillText("No necesitas cuenta", W / 2, y + size + 138);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/png"));
}

// Share button of a quiz. Opening it already shows the QR (same quiz for everyone); the second mode, the QR as a printable
// card, the full-screen projector view and the native share sheet are one tap away. Used on the results page and in the list.
export function ShareButton({
  quizId,
  title,
  topic = null,
  canVariant,
  compact = false,
}: {
  quizId: string;
  title: string;
  topic?: string | null;
  canVariant: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [projecting, setProjecting] = useState(false);
  const [mode, setMode] = useState<Mode>("fixed");
  const [shared, setShared] = useState<Partial<Record<Mode, Shared>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const cleanTitle = title.replace(/^(Repaso|Repetición): /, "");
  const current = shared[mode];

  async function load(m: Mode) {
    setMode(m);
    setError(null);
    if (shared[m]) return;
    setBusy(true);
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId, mode: m }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    if (!res || !res.ok || !data?.path) {
      setBusy(false);
      return setError(data?.error ?? "No se pudo crear el enlace. Intenta de nuevo.");
    }
    const url = typeof data.url === "string" ? data.url : `${window.location.origin}${data.path}`;
    const qr = await QRCode.toDataURL(url, { ...QR_OPTIONS, width: 720 }).catch(() => null);
    setShared((s) => ({ ...s, [m]: { url, plays: Number(data.plays) || 0, qr } }));
    setBusy(false);
  }

  function openModal() {
    setOpen(true);
    void load("fixed");
  }

  function close() {
    setOpen(false);
    setProjecting(false);
    setNotice(null);
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (projecting) setProjecting(false);
      else close();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, projecting]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice((n) => (n === message ? null : n)), 2200);
  }

  async function copy() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.url);
      flash("¡Enlace copiado!");
    } catch {
      setError("No se pudo copiar. Selecciona el enlace y cópialo a mano.");
    }
  }

  async function nativeShare() {
    if (!current) return;
    try {
      await navigator.share({ title: cleanTitle, text: `Juega este quiz: ${cleanTitle}`, url: current.url });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setError("No se pudo abrir el menú de compartir.");
    }
  }

  async function download() {
    if (!current?.qr) return;
    try {
      const blob = await makeCard(cleanTitle, topic, current.qr);
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `qr-${cleanTitle.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "quiz"}.png`;
      a.click();
      URL.revokeObjectURL(href);
      flash("QR descargado");
    } catch {
      setError("No se pudo generar la imagen. Intenta de nuevo.");
    }
  }

  const canNativeShare = open && typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <>
      <button onClick={openModal} className={compact ? "hx-btn !px-3 !py-2 text-sm" : "hx-btn w-full"} aria-label={compact ? `Compartir con QR: ${cleanTitle}` : undefined} title="Compartir con QR">
        <span aria-hidden>{compact ? "▦" : "🔗"}</span> {compact ? "QR" : "Compartir este quiz"}
      </button>

      {open &&
        createPortal(
          <div className="hx anim-fade-in fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-3" onClick={close}>
            <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="hx-epic hx-epic-still modal-in my-auto w-full max-w-md p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="share-title" className="font-display text-xl font-bold sm:text-2xl">
                    Compartir con QR
                  </h2>
                  <p className="hx-mute truncate text-sm">{cleanTitle}</p>
                </div>
                <button onClick={close} aria-label="Cerrar" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--line-strong)]">
                  ✕
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] p-1 text-sm font-bold" role="group" aria-label="Tipo de quiz">
                <button aria-pressed={mode === "fixed"} onClick={() => load("fixed")} disabled={busy} className={`rounded-lg px-2 py-2 transition ${mode === "fixed" ? "bg-gradient-to-r from-[var(--b1)] to-[var(--b2)] text-[#2a2012]" : "hx-mute hover:text-[var(--fg)]"}`}>
                  Igual para todos
                </button>
                <button
                  aria-pressed={mode === "variant"}
                  onClick={() => load("variant")}
                  disabled={busy || !canVariant}
                  title={canVariant ? undefined : "No disponible: el apunte de este quiz ya no existe."}
                  className={`rounded-lg px-2 py-2 transition disabled:cursor-not-allowed disabled:opacity-45 ${mode === "variant" ? "bg-gradient-to-r from-[var(--b1)] to-[var(--b2)] text-[#2a2012]" : "hx-mute hover:text-[var(--fg)]"}`}
                >
                  Uno distinto c/u
                </button>
              </div>
              <p className="hx-mute mt-2 text-center text-xs">
                {mode === "fixed" ? "Mismas preguntas; el orden se mezcla por persona." : "La IA escribe preguntas nuevas del mismo apunte para cada persona."}
              </p>

              <div className="mt-4 text-center">
                {current?.qr ? (
                  <button onClick={() => setProjecting(true)} className="group relative mx-auto block rounded-2xl bg-white p-2 shadow-lg transition" aria-label="Ampliar el QR a pantalla completa">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={current.qr} alt={`Código QR para jugar ${cleanTitle}`} width={240} height={240} className="h-auto w-[min(240px,62vw)]" />
                    <span className="absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full bg-[#1d1826]/85 px-3 py-0.5 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">Ampliar</span>
                  </button>
                ) : (
                  <div className="mx-auto grid h-[256px] w-[min(256px,66vw)] place-items-center rounded-2xl border border-dashed border-[var(--line-strong)]" aria-live="polite">
                    {busy ? <Spinner /> : <span className="hx-mute px-4 text-sm">{error ? "Sin QR" : "…"}</span>}
                  </div>
                )}
                {current && (
                  <p className="hx-mute mt-2 text-xs">
                    {current.plays > 0 ? `Jugado ${current.plays} ${current.plays === 1 ? "vez" : "veces"}` : "Aún nadie lo ha jugado"} · sin cuenta
                  </p>
                )}
              </div>

              {current && (
                <>
                  <input readOnly value={current.url} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace del quiz" className="mt-3 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-2 text-center text-sm" />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={copy} className="hx-btn hx-btn-gold">
                      Copiar enlace
                    </button>
                    {canNativeShare ? (
                      <button onClick={nativeShare} className="hx-btn">
                        Compartir…
                      </button>
                    ) : (
                      <button onClick={() => setProjecting(true)} className="hx-btn">
                        Proyectar
                      </button>
                    )}
                    <button onClick={download} disabled={!current.qr} className="hx-btn">
                      Descargar QR
                    </button>
                    {canNativeShare ? (
                      <button onClick={() => setProjecting(true)} className="hx-btn">
                        Proyectar
                      </button>
                    ) : (
                      <a href={current.url} target="_blank" rel="noreferrer" className="hx-btn">
                        Abrir quiz
                      </a>
                    )}
                  </div>
                </>
              )}

              <p role="status" aria-live="polite" className="mt-3 min-h-5 text-center text-sm font-bold text-[var(--ok)]">
                {notice}
              </p>
              {error && (
                <p role="alert" className="mt-1 rounded-lg border-l-4 border-[var(--bad)] bg-[var(--bad)]/10 px-3 py-2 text-sm font-bold text-[var(--bad)]">
                  {error}
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}

      {open &&
        projecting &&
        current?.qr &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="QR a pantalla completa"
            className="fixed inset-0 z-[60] flex cursor-zoom-out flex-col items-center justify-center gap-5 bg-white p-6 text-center text-[#1d1826]"
            onClick={() => setProjecting(false)}
          >
            <p className="font-display text-[clamp(1.4rem,4.5vmin,2.6rem)] font-bold leading-tight">{cleanTitle}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.qr} alt={`Código QR para jugar ${cleanTitle}`} className="aspect-square w-[min(72vmin,720px)]" />
            <p className="text-[clamp(1rem,3vmin,1.7rem)] font-bold">Escanea con la cámara para jugar</p>
            <p className="text-[clamp(.8rem,2vmin,1.1rem)] text-[#7a6a52]">{current.url.replace(/^https?:\/\//, "")}</p>
            <p className="absolute bottom-4 text-xs text-[#7a6a52]">Toca o pulsa Esc para cerrar</p>
          </div>,
          document.body,
        )}
    </>
  );
}
