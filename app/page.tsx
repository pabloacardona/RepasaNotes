import Link from "next/link";
import { RetroBackdrop } from "@/components/world/retro-backdrop";
import { HeroMascot } from "@/components/landing/hero-mascot";
import { RankEmblem } from "@/components/game/rank-emblem";
import { ThemeToggle } from "@/components/theme-toggle";

const STEPS = [
  { n: "1", icon: "📜", title: "Pega tus apuntes", text: "Escríbelos o sube un PDF." },
  { n: "2", icon: "⚔️", title: "Juega el quiz", text: "La IA crea las preguntas por ti." },
  { n: "3", icon: "⭐", title: "Repasa lo que fallas", text: "Gana XP y sube de rango." },
];

export default function Landing() {
  return (
    <div className="hx flex min-h-dvh flex-col">
      <RetroBackdrop />

      <header className="border-b-4 border-[var(--line-strong)] bg-[var(--bg)]">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <RankEmblem tierIndex={3} size={32} />
            <span className="font-[family-name:var(--font-press)] text-sm">REPASA</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="hidden font-bold hover:underline sm:inline">
              Entrar
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:py-16">
        <section className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="hx-kicker">Estudiar es un juego</p>
            <h1 className="hx-title mt-4 text-5xl leading-none sm:text-7xl">
              REPASA <span className="hx-gold-text">sin aburrirte</span>
            </h1>
            <p className="mt-5 max-w-md text-xl text-[var(--fg2)]">Sube tus apuntes, juega el quiz y repasa lo que fallaste.</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/login?tab=registro" className="hx-btn hx-btn-gold !px-6 !py-4">
                ▶ Jugar
              </Link>
              <span className="hx-blink font-[family-name:var(--font-press)] text-[0.6rem] text-[var(--mute)]">PRESS START</span>
            </div>
          </div>
          <HeroMascot className="relative mx-auto h-[320px] w-full max-w-sm" />
        </section>

        <section className="mt-14 grid gap-5 sm:grid-cols-3" aria-label="Cómo funciona">
          {STEPS.map((s) => (
            <div key={s.n} className="hx-panel hx-lift p-5">
              <p className="font-[family-name:var(--font-press)] text-[0.6rem] text-[var(--neon)]">NIVEL {s.n}</p>
              <p className="mt-3 text-4xl" aria-hidden>
                {s.icon}
              </p>
              <h2 className="mt-2 text-xl">{s.title}</h2>
              <p className="hx-mute mt-1">{s.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t-4 border-[var(--line-strong)] py-4 text-center font-[family-name:var(--font-press)] text-[0.55rem] text-[var(--mute)]">
        REPASA · © 2026
      </footer>
    </div>
  );
}
