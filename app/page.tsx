import Link from "next/link";
import { CalmBackdrop } from "@/components/world/calm-backdrop";
import { HeroMascot } from "@/components/landing/hero-mascot";
import { RankEmblem } from "@/components/game/rank-emblem";
import { RankLadder } from "@/components/game/rank-ladder";
import { SocratesLogo } from "@/components/socrates-logo";
import { Waves, Ripples } from "@/components/landing/waves";
import { ThemeToggle } from "@/components/theme-toggle";
import { MascotPicker } from "@/components/world/mascot-picker";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { MASCOTS } from "@/lib/mascot-data";
import { TIERS } from "@/lib/ranks";

const STEPS = [
  { n: "01", icon: "📜", title: "Pega tus apuntes", text: "Escríbelos, sube un PDF o pídele a la IA que los redacte.", glow: "#d9a066" },
  { n: "02", icon: "⚔️", title: "Juega el quiz", text: "Preguntas hechas por IA, combos, rachas y una mascota que reacciona.", glow: "#c9667a" },
  { n: "03", icon: "🏆", title: "Sube de rango", text: "Repasa lo que fallas, gana XP y escala de Hierro a Retador.", glow: "#e7c88a" },
];

export default function Landing() {
  return (
    <div className="hx lite-fx">
      <CalmBackdrop />

      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bg)]/90">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <SocratesLogo size={48} />
            <span className="hx-yellow font-display text-2xl font-bold tracking-wide">Repasa</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-5">
            <a href="#como-se-juega" className="hx-mute hidden text-sm font-semibold hover:text-[var(--fg)] sm:inline">
              Cómo se juega
            </a>
            <a href="#rangos" className="hx-mute hidden text-sm font-semibold hover:text-[var(--fg)] sm:inline">
              Rangos
            </a>
            <ThemeToggle />
            <Link href="/login" className="hidden font-bold hover:underline sm:inline">
              Entrar
            </Link>
            <Link href="/login?tab=registro" className="hx-btn hx-btn-gold !px-4 !py-2 text-sm">
              Jugar ahora
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <Waves className="absolute inset-x-0 bottom-0 z-0 h-56" />
          <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-6 px-4 pb-24 pt-12 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pb-24 lg:pt-20">
            <div>
              <Reveal>
                <p className="hx-kicker flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--neon)] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--neon)]" />
                  </span>
                  Temporada 1 · estudia con IA
                </p>
                <h1 className="mt-4 font-display text-6xl font-bold leading-[0.98] tracking-tight sm:text-8xl">
                  Repasa.
                  <br />
                  <span className="hx-gold-text">A tu ritmo.</span>
                </h1>
                <p className="hx-mute mt-6 max-w-lg text-lg leading-snug sm:text-xl">
                  Convierte tus apuntes en quizzes, practica con calma y mira cómo avanzas. Sin prisa, sin ruido: solo tú y lo que quieres aprender.
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <Link href="/login?tab=registro" className="hx-btn hx-btn-gold hx-shine !px-8 !py-4 text-lg">
                    Empezar a jugar →
                  </Link>
                  <a href="#rangos" className="hx-btn !px-7 !py-4 text-lg">
                    Ver los rangos
                  </a>
                </div>
                <div className="mt-10 flex flex-wrap gap-3">
                  {[
                    [`${TIERS.length}`, "rangos"],
                    ["40", "logros"],
                    [`${MASCOTS.length}`, "compañeros"],
                  ].map(([n, l]) => (
                    <div key={l} className="hx-panel hx-panel-soft min-w-[6.5rem] px-4 py-2.5">
                      <p className="hx-gold-text font-display text-3xl font-bold">{n}</p>
                      <p className="hx-mute text-xs font-bold uppercase tracking-widest">{l}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <Ripples className="absolute inset-0" />
              <HeroMascot className="relative h-[400px] w-full sm:h-[470px]" />
              <MascotPicker className="!absolute right-0 bottom-24 z-20" />
              <div className="hx-panel hx-epic-soft absolute -bottom-4 left-0 right-0 mx-auto w-[92%] p-3">
                <div className="flex items-center gap-3">
                  <RankEmblem tierIndex={4} division={2} size={58} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold leading-none">Platino II</p>
                    <div className="hx-bar mt-2">
                      <span style={{ width: "68%" }} />
                    </div>
                  </div>
                  <span className="hx-sticker">+225 XP</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section id="como-se-juega" className="cv-auto mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <Reveal>
            <p className="hx-kicker">Cómo se juega</p>
            <h2 className="mt-2 font-display text-4xl font-bold sm:text-6xl">Tres pasos. Un solo objetivo.</h2>
          </Reveal>
          <Stagger className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <StaggerItem key={s.n}>
                <SpotlightCard className="hx-panel hx-lift h-full p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-5xl font-bold" style={{ color: s.glow, textShadow: `0 0 28px ${s.glow}` }}>
                      {s.n}
                    </span>
                    <span className="text-5xl drop-shadow-xl" aria-hidden>
                      {s.icon}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-2xl font-bold">{s.title}</h3>
                  <p className="hx-mute mt-2">{s.text}</p>
                </SpotlightCard>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Ranks */}
        <section id="rangos" className="cv-auto mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <Reveal>
            <p className="hx-kicker">La escalera</p>
            <h2 className="mt-2 font-display text-4xl font-bold sm:text-6xl">
              De Hierro a <span className="hx-gold-text">Retador</span>
            </h2>
            <p className="hx-mute mt-3 max-w-xl text-lg">Cada quiz te da XP. Toca un rango para verlo brillar.</p>
          </Reveal>
          <div className="mt-8">
            <RankLadder preview tierIndex={0} xp={0} />
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] py-6 text-center text-sm hx-mute">Repasa · Tus apuntes, convertidos en juego.</footer>
    </div>
  );
}
