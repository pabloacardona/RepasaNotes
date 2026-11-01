"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { XpChip, type ChipGame } from "@/components/game/xp-chip";

const LINKS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/apuntes", label: "Apuntes" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/logros", label: "Logros" },
];

export function AppNav({ name, game }: { name: string; game?: ChipGame | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 bg-ink text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="font-display text-2xl font-bold text-yellow">
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
                className={`rounded-md px-2 py-1 font-semibold transition ${
                  active ? "text-yellow" : "text-white/85 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          {game && <XpChip {...game} />}
          <div className="relative ml-1">
            <button
              onClick={() => setOpen((o) => !o)}
              aria-label="Menú de usuario"
              aria-expanded={open}
              className="grid h-9 w-9 place-items-center rounded-full bg-blue font-bold"
            >
              {name.charAt(0).toUpperCase()}
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
      <div className="h-1 bg-yellow" />
    </header>
  );
}
