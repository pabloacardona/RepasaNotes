"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PlayerHud, type HudData } from "@/components/game/player-hud";
import { SocratesLogo } from "@/components/socrates-logo";
import { Avatar } from "@/components/avatar";
import { photoToAvatar } from "@/components/avatar-upload";

const LINKS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/apuntes", label: "Apuntes" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/logros", label: "Logros" },
];

export function AppNav({ name, avatar, game }: { name: string; avatar?: string | null; game?: HudData | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null | undefined>(avatar);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function changePhoto(file: File) {
    setPhotoError(null);
    try {
      const data = await photoToAvatar(file);
      const res = await fetch("/api/profile/avatar", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatar: data }) });
      if (!res.ok) throw new Error();
      setPhoto(data);
      router.refresh();
    } catch {
      setPhotoError("No se pudo guardar la foto. Prueba con otra imagen.");
    }
  }

  async function removePhoto() {
    setPhotoError(null);
    const res = await fetch("/api/profile/avatar", { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      setPhoto(null);
      router.refresh();
    } else setPhotoError("No se pudo quitar la foto.");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-[var(--bg)]/80 text-ink backdrop-blur-xl">
      <nav className="relative z-30 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 sm:flex-nowrap sm:gap-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-display text-2xl font-bold tracking-wide">
          <SocratesLogo size={48} />
          <span className="hx-yellow">Repasa</span>
        </Link>
        <div className="contents sm:flex sm:items-center sm:gap-4">
          <div className="order-3 -mx-1 flex w-full items-center justify-between gap-1 overflow-x-auto sm:order-none sm:mx-0 sm:w-auto sm:justify-start sm:overflow-visible">
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
          </div>
          <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="relative ml-1">
            <button
              onClick={() => setOpen((o) => !o)}
              aria-label="Menú de usuario"
              aria-expanded={open}
              className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-2)] py-0.5 pl-0.5 pr-3 transition hover:border-[var(--neon)]"
            >
              <span className="relative">
                <Avatar name={name} src={photo} size={32} />
                <span aria-hidden className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg)] bg-[var(--ok)]" />
              </span>
              <span className="max-w-[6.5rem] truncate text-sm font-bold">{name.split(" ")[0]}</span>
            </button>
            {open && (
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-line bg-card p-2 text-ink shadow-lg">
                <p className="truncate px-2 py-1 text-sm text-muted">{name}</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-label="Subir foto de perfil"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) changePhoto(f);
                  }}
                />
                <button onClick={() => fileRef.current?.click()} className="w-full rounded-lg px-2 py-2 text-left font-semibold hover:bg-[var(--fg)]/5">
                  📷 Cambiar foto
                </button>
                {photo && (
                  <button onClick={removePhoto} className="w-full rounded-lg px-2 py-2 text-left text-sm text-ink-soft hover:bg-[var(--fg)]/5">
                    Quitar foto
                  </button>
                )}
                {photoError && <p role="alert" className="px-2 py-1 text-xs font-bold text-red">{photoError}</p>}
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
        </div>
      </nav>
      {game && <PlayerHud {...game} />}
    </header>
  );
}
