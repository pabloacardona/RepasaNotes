import Link from "next/link";
import { ShaderBackdrop } from "@/components/world/shader-backdrop";
import { HeroMascot } from "@/components/landing/hero-mascot";
import { SpotCard } from "@/components/landing/spot-card";
import { RankEmblem } from "@/components/game/rank-emblem";
import { ThemeToggle } from "@/components/theme-toggle";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { MASCOTS } from "@/lib/mascot-data";
import { TIERS } from "@/lib/ranks";

const TICKER = [
  "Apuntes", "Quizzes con IA", "Combos", "Rangos", "Conquista de temas", "Logros", "Racha diaria", "21 compañeros",
  "Hierro → Retador", "Modo difícil", "Refuerzo", "Victoria", "Derrota", "Repasa",
];

export default function Landing() {
  return (
    <div className="hx">
      <ShaderBackdrop calm />

      <header className="sticky top-0 z-30 border-b-[1.5px] border-[var(--line-strong)] bg-[var(--bg)]/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <RankEmblem tierIndex={3} size={34} />
            <span className="font-display text-3xl leading-none">repasa</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-5">
            <a href="#como-se-juega" className="hidden font-mono text-xs font-semibold uppercase tracking-widest hover:text-[var(--neon)] sm:inline">
              Cómo se juega
            </a>
            <a href="#rangos" className="hidden font-mono text-xs font-semibold uppercase tracking-widest hover:text-[var(--neon)] sm:inline">
              Rangos
            </a>
            <ThemeToggle />
            <Link href="/login" className="hidden font-bold hover:underline sm:inline">
              Entrar
            </Link>
            <Link href="/login?tab=registro" className="hx-btn hx-btn-gold !px-4 !py-1.5 text-sm">
              Jugar ahora
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div className="mx-auto grid max-w-6xl items-center gap-4 px-4 pb-10 pt-12 sm:px-6 lg:grid-cols-[1.25fr_1fr] lg:pb-16 lg:pt-20">
            <div>
              <Reveal>
                <span className="hx-sticker">Temporada 1 · estudia con IA</span>
                <h1 className="hx-title mt-5 text-[3.4rem] sm:text-[5.6rem] lg:text-[6.6rem]">
                  Estudia como si fuera <span className="hx-gold-text">un videojuego</span>
                </h1>
                <p className="mt-5 max-w-lg text-lg leading-snug text-[var(--fg2)] sm:text-xl">
                  Pega tus apuntes, la IA arma el quiz. Juega, haz combos, sube de Hierro a Retador y conquista cada tema antes del examen.
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link href="/login?tab=registro" className="hx-btn hx-btn-gold !px-7 !py-3.5 text-lg">
                    Empezar gratis →
                  </Link>
                  <a href="#rangos" className="hx-btn !px-6 !py-3.5 text-lg">
                    Ver los rangos
                  </a>
                </div>
                <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-3 font-mono text-xs uppercase tracking-widest">
                  {[
                    [`${TIERS.length}`, "rangos"],
                    ["40", "logros"],
                    [`${MASCOTS.length}`, "compañeros"],
                    ["0 €", "para empezar"],
                  ].map(([n, l]) => (
                    <div key={l}>
                      <dd className="font-display text-4xl normal-case tracking-normal">{n}</dd>
                      <dt className="hx-mute">{l}</dt>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <HeroMascot className="relative h-[400px] w-full sm:h-[470px]" />
              <div className="hx-panel hx-float absolute -bottom-3 left-0 right-6 mx-auto w-[90%] p-3">
                <div className="flex items-center gap-3">
                  <RankEmblem tierIndex={2} division={2} size={46} />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs font-bold uppercase tracking-widest">Plata II</p>
                    <div className="hx-bar mt-1.5">
                      <span style={{ width: "64%" }} />
                    </div>
                  </div>
                  <span className="hx-sticker !rotate-2">+225 XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ticker */}
          <div className="overflow-hidden border-y-[1.5px] border-[var(--line-strong)] bg-[var(--accent)] py-2.5 text-[var(--on-accent)]" aria-hidden>
            <div className="hx-marquee font-display text-2xl italic">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span key={i} className="flex items-center whitespace-nowrap">
                  <span className="px-5">{t}</span>
                  <span className="text-lg not-italic">✦</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* How it works: bento */}
        <section id="como-se-juega" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6">
          <Reveal>
            <p className="hx-kicker">Cómo se juega</p>
            <h2 className="hx-title mt-2 max-w-3xl text-5xl sm:text-6xl">
              Del apunte al <span className="hx-gold-text">rango</span> en cuatro pasos
            </h2>
          </Reveal>
          <Stagger className="mt-10 grid gap-4 md:grid-cols-6">
            <StaggerItem className="md:col-span-4">
              <SpotCard className="h-full p-6">
                <p className="font-mono text-xs font-bold tracking-widest">01 / APUNTES</p>
                <h3 className="mt-3 text-4xl">Guarda lo que tienes que estudiar</h3>
                <p className="mt-2 max-w-md text-[var(--fg2)]">Escríbelo, sube un PDF o Word, o pide a la IA que redacte un apunte del tema.</p>
                <div className="mt-5 flex flex-wrap gap-2 font-mono text-xs font-semibold uppercase">
                  {["PDF", "Word", "Texto", "Con IA"].map((t) => (
                    <span key={t} className="border-[1.5px] border-[var(--line-strong)] px-2.5 py-1">
                      {t}
                    </span>
                  ))}
                </div>
              </SpotCard>
            </StaggerItem>
            <StaggerItem className="md:col-span-2">
              <SpotCard className="h-full !bg-[var(--accent)] p-6 !text-[var(--on-accent)]">
                <p className="font-mono text-xs font-bold tracking-widest">02 / FORJA</p>
                <h3 className="mt-3 text-4xl">La IA hace el quiz</h3>
                <p className="mt-2 opacity-80">5, 10 o 15 preguntas. Fácil, media o jefe final.</p>
              </SpotCard>
            </StaggerItem>
            <StaggerItem className="md:col-span-2">
              <SpotCard className="h-full p-6">
                <p className="font-mono text-xs font-bold tracking-widest">03 / COMBATE</p>
                <h3 className="mt-3 text-4xl">Combos y rachas</h3>
                <p className="mt-2 text-[var(--fg2)]">Cada acierto sube el combo. Tu compañero reacciona.</p>
              </SpotCard>
            </StaggerItem>
            <StaggerItem className="md:col-span-4">
              <SpotCard className="h-full p-6">
                <p className="font-mono text-xs font-bold tracking-widest">04 / RANGO</p>
                <h3 className="mt-3 text-4xl">Falla, refuerza y sube</h3>
                <p className="mt-2 max-w-md text-[var(--fg2)]">Un quiz nuevo con solo lo que fallaste. Cada tema tiene su rango: llega a Oro y es tuyo.</p>
                <div className="mt-5 flex items-end gap-2">
                  {TIERS.slice(0, 6).map((t, i) => (
                    <RankEmblem key={t.id} tierIndex={i} division={1} size={44 + i * 4} />
                  ))}
                </div>
              </SpotCard>
            </StaggerItem>
          </Stagger>
        </section>

        {/* Ranks rail */}
        <section id="rangos" className="scroll-mt-16 border-y-[1.5px] border-[var(--line-strong)] bg-[var(--surface)]/80 py-16 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <p className="hx-kicker">La escalera</p>
              <h2 className="hx-title mt-2 text-5xl sm:text-6xl">
                De Hierro a <span className="hx-gold-text">Retador</span>
              </h2>
              <p className="hx-mute mt-2 max-w-xl">Cada quiz da XP. Cada división es un escalón. Los colores brillan más cuanto más alto llegas.</p>
            </Reveal>
          </div>
          <div className="mt-10 overflow-x-auto px-4 pb-4 [scrollbar-width:thin] sm:px-6">
            <ol className="mx-auto flex w-max gap-4">
              {TIERS.map((t, i) => (
                <li key={t.id} className="hx-panel hx-lift flex w-40 shrink-0 flex-col items-center p-4 text-center">
                  <span className="self-start font-mono text-[0.65rem] font-bold">{String(i + 1).padStart(2, "0")}</span>
                  <RankEmblem tierIndex={i} division={t.divisions ? 1 : null} size={96} />
                  <p className="mt-2 font-display text-2xl leading-none" style={{ color: `color-mix(in oklab, ${t.color} 70%, var(--fg))` }}>
                    {t.name}
                  </p>
                  <p className="hx-mute mt-1 font-mono text-[0.65rem]">{t.min.toLocaleString("es-CO")} XP</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Companions */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <p className="hx-kicker">Compañeros</p>
            <h2 className="hx-title mt-2 text-5xl sm:text-6xl">
              Elige quién te <span className="hx-gold-text">acompaña</span>
            </h2>
          </Reveal>
          <Stagger className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7" gap={0.025}>
            {MASCOTS.map((m) => (
              <StaggerItem key={m.id}>
                <div className="hx-panel hx-lift p-3 text-center">
                  <p className="text-4xl" aria-hidden>
                    {m.emoji}
                  </p>
                  <p className="mt-1 truncate font-mono text-[0.65rem] font-semibold uppercase">{m.label}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* CTA */}
        <section className="px-4 pb-16 sm:px-6">
          <Reveal>
            <div className="hx-panel mx-auto max-w-5xl overflow-hidden !bg-[var(--accent)] px-6 py-14 text-center !text-[var(--on-accent)] sm:py-20">
              <h2 className="font-display text-5xl leading-[0.95] sm:text-7xl">
                Releer no te dice
                <br />
                <em>qué no dominas.</em>
              </h2>
              <p className="mx-auto mt-4 max-w-md font-medium">Un quiz sí. Crea tu cuenta, juega tu primera misión y mira en qué rango empiezas.</p>
              <Link href="/login?tab=registro" className="hx-btn mt-8 !bg-[var(--on-accent)] !px-8 !py-4 text-lg !text-[var(--accent)]">
                Crear cuenta gratis →
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t-[1.5px] border-[var(--line-strong)] py-6 text-center font-mono text-xs uppercase tracking-widest text-[var(--mute)]">
        repasa · tus apuntes, convertidos en juego
      </footer>
    </div>
  );
}
