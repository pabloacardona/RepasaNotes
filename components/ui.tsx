import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "ai" | "dark" | "outline" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-gradient-to-r from-[var(--b1)] to-[var(--b2)] text-white shadow-[0_4px_18px_rgba(124,92,255,0.4)] hover:brightness-110",
  ai: "bg-[#e7c88a] text-[#2a2012] shadow-[0_4px_16px_rgba(231,200,138,0.25)] hover:brightness-95",
  dark: "border border-[var(--line-strong)] bg-[var(--surface-2)] text-[var(--hi)] hover:border-[var(--neon)]",
  outline: "border-2 border-[var(--line-strong)] text-ink bg-transparent hover:border-[var(--neon)] hover:bg-ink/5",
  ghost: "text-blue hover:bg-blue-soft",
  danger: "text-red hover:bg-red-soft",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-bold transition disabled:opacity-60 disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-2xl border border-line bg-card/90 shadow-[var(--shadow)] backdrop-blur ${className}`} {...props} />;
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent"
      style={{ animation: "spin 0.8s linear infinite" }}
    />
  );
}

export function FieldMessage({ error, ok }: { error?: string; ok?: string }) {
  if (error)
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-red" role="alert">
        <span aria-hidden>⚠</span> {error}
      </p>
    );
  if (ok)
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-green">
        <span aria-hidden>✓</span> {ok}
      </p>
    );
  return null;
}

export function inputClass(state?: "error" | "ok") {
  const border =
    state === "error" ? "border-red" : state === "ok" ? "border-green" : "border-line focus:border-blue";
  return `w-full rounded-xl border-2 bg-card px-3.5 py-2 text-ink outline-none transition ${border}`;
}

export function PageHeader({ title, action, kicker }: { title: string; action?: ReactNode; kicker?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker && <p className="text-muted">{kicker}</p>}
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}
