import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "ai" | "dark" | "outline" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "border-[1.5px] border-[var(--line-strong)] bg-[var(--accent)] text-[var(--on-accent)] shadow-[3px_3px_0_var(--line-strong)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--line-strong)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
  ai: "border-[1.5px] border-[var(--line-strong)] bg-[#ffd23f] text-[#1a1400] shadow-[3px_3px_0_var(--line-strong)] hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
  dark: "border-[1.5px] border-[var(--line-strong)] bg-[var(--surface-2)] text-ink shadow-[3px_3px_0_var(--line-strong)] hover:-translate-x-px hover:-translate-y-px",
  outline: "border-[1.5px] border-[var(--line-strong)] text-ink bg-transparent shadow-[3px_3px_0_var(--line-strong)] hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
  ghost: "text-blue hover:bg-blue-soft",
  danger: "text-red hover:bg-red-soft",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-bold transition disabled:opacity-60 disabled:cursor-not-allowed";

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
  return <div className={`rounded-[10px] border-[1.5px] border-[var(--line-strong)] bg-card shadow-[var(--shadow)] ${className}`} {...props} />;
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
  return `w-full rounded-lg border-[1.5px] bg-card px-3.5 py-2 text-ink outline-none transition ${border}`;
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
