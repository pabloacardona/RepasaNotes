"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PlayerHud, type HudData } from "@/components/game/player-hud";

const LINKS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/apuntes", label: "Apuntes" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/logros", label: "Logros" },
];

export function AppNav({ name, game }: { name: string; game?: HudData | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[var(--bg)]/80 text-ink backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <Link href="/dashboard" className="hx-yellow font-display text-2xl font-bold tracking-wide">
          Repasa
        </Link>
        <div className="flex items-center gap-1 sm:gap-4">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-2.5 py-1 text-sm font-semibold transition ${
                  active ? "bg-[var(--fg)]/10 text-ink" : "text-ink-soft hover:bg-[var(--fg)]/5 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <ThemeToggle />
          <div className="relative ml-1">
            <button
              onClick={() => setOpen((o) => !o)}
              aria-label="Menú de usuario"
              aria-expanded={open}
              className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-2)] py-0.5 pl-0.5 pr-3 transition hover:border-[var(--neon)]"
            >
              <span className="relative grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[var(--b1)] to-[var(--b2)] font-bold text-white">
                {name.charAt(0).toUpperCase()}
                <span aria-hidden className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg)] bg-[var(--ok)]" />
              </span>
              <span className="max-w-[6.5rem] truncate text-sm font-bold">{name.split(" ")[0]}</span>
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-line bg-card p-2 text-ink shadow-lg">
                <p className="truncate px-2 py-1 text-sm text-muted">{name}</p>
                <button
                  onClick={logout}
                  className="w-full rounded-lg px-2 py-2 text-left font-semibold text-red hover:bg-red-soft"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      {game && <PlayerHud {...game} />}
    </header>
  );
}
