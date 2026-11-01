import Link from "next/link";
import { InteractiveBackdrop } from "@/components/world/interactive-backdrop";
import { HeroMascot } from "@/components/landing/hero-mascot";
import { RankEmblem } from "@/components/game/rank-emblem";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { MASCOTS } from "@/lib/mascot-data";
import { TIERS } from "@/lib/ranks";
import { ACHIEVEMENTS, RARITIES } from "@/lib/gamification";

const ABILITIES = [
  { key: "Q", icon: "📜", name: "Apuntes", text: "Escríbelos, súbelos en PDF o Word, o pide a la IA que redacte uno del tema que necesitas." },
  { key: "W", icon: "⚗️", name: "Forja", text: "La IA convierte el apunte en 5, 10 o 15 preguntas. Fácil, media o jefe final." },
  { key: "E", icon: "⚔️", name: "Combate", text: "Combos, rachas, tiempo y una mascota que reacciona a cada respuesta." },
  { key: "R", icon: "🎯", name: "Refuerzo", text: "Al terminar, un quiz nuevo solo con los conceptos que fallaste. Ahí se sube de rango." },
];

const DEMO_TOPICS = [
  { name: "Bases de datos", tier: 4, pct: 72, conquered: true },
  { name: "Cálculo", tier: 2, pct: 48, conquered: false },
  { name: "Historia", tier: 3, pct: 20, conquered: true },
];

export default function Landing() {
  return (
    <div className="hx">
      <div className="hx-bg" aria-hidden />
      <InteractiveBackdrop calm />

      <header className="sticky top-0 z-30 border-b border-[#785a28]/60 bg-[#010a13]/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <RankEmblem tierIndex={3} size={38} />
            <span className="hx-title hx-gold-text text-2xl tracking-[0.18em]">REPASA</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-6">
            <a href="#como-se-juega" className="hx-mute hidden font-bold hover:text-[#f0d89a] sm:inline">
              Cómo se juega
            </a>
            <a href="#rangos" className="hx-mute hidden font-bold hover:text-[#f0d89a] sm:inline">
              Rangos
            </a>
            <Link href="/login" className="font-bold text-[#f0e6d2] hover:text-[#f0d89a]">
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
        <section className="relative">
          <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
            <div>
              <Reveal>
                <p className="hx-kicker flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0ac8b9] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0ac8b9]" />
                  </span>
                  Temporada 1 · Estudia con IA
                </p>
                <h1 className="hx-title mt-4 text-5xl leading-[1.05] sm:text-7xl">
                  Conquista
                  <br />
                  <span className="hx-gold-text">tus apuntes</span>
                </h1>
                <p className="hx-mute mt-5 max-w-xl text-lg sm:text-xl">
                  Convierte tus notas en quizzes con IA, juega contra ti mismo, sube de rango de Hierro a Retador y conquista cada tema de tu carrera.
                </p>
              </Reveal>
              <Reveal delay={0.25}>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link href="/login?tab=registro" className="hx-btn hx-btn-gold hx-shine !px-8 !py-4 text-lg">
                    Empezar a jugar
                  </Link>
                  <a href="#rangos" className="hx-btn !px-8 !py-4 text-lg">
                    Ver los rangos
                  </a>
                </div>
                <dl className="mt-10 grid max-w-md grid-cols-3 gap-3 text-center">
                  {[
                    [`${TIERS.length}`, "Rangos"],
                    [`${ACHIEVEMENTS.length * 4}`, "Logros"],
                    [`${MASCOTS.length}`, "Compañeros"],
                  ].map(([n, l]) => (
                    <div key={l} className="border border-[#785a28]/50 bg-white/5 py-2">
                      <dd className="hx-title hx-gold-text text-3xl">{n}</dd>
                      <dt className="hx-mute text-[0.65rem] font-bold uppercase tracking-widest">{l}</dt>
                    </div>
                  ))}
                </dl>
              </Reveal>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div aria-hidden className="absolute inset-x-6 bottom-6 top-16 rounded-full bg-[#0ac8b9]/15 blur-3xl" />
              <HeroMascot className="relative h-[420px] w-full sm:h-[480px]" />
              <div className="hx-panel hx-panel-soft absolute -bottom-2 left-0 right-0 mx-auto w-[88%] p-3">
                <div className="flex items-center gap-3">
                  <RankEmblem tierIndex={2} division={2} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-cinzel)] text-sm font-bold uppercase tracking-wider">Plata II</p>
                    <div className="hx-bar mt-1">
                      <span style={{ width: "64%" }} />
                    </div>
                  </div>
                  <span className="font-bold text-[#0ac8b9]">+225 XP</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How to play */}
        <section id="como-se-juega" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <Reveal>
            <p className="hx-kicker">Cómo se juega</p>
            <h2 className="hx-title mt-1 text-3xl sm:text-4xl">Cuatro habilidades. Un solo objetivo.</h2>
            <div className="hx-rule mt-4">
              <span />
            </div>
          </Reveal>
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ABILITIES.map((a) => (
              <StaggerItem key={a.key}>
                <div className="hx-panel hx-lift h-full p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-4xl" aria-hidden>
                      {a.icon}
                    </span>
                    <kbd className="grid h-9 w-9 place-items-center border border-[#c8aa6e] bg-[#07101e] font-[family-name:var(--font-cinzel)] text-lg font-black text-[#f0d89a] shadow-[inset_0_-3px_0_rgba(0,0,0,0.5)]">
                      {a.key}
                    </kbd>
                  </div>
                  <h3 className="hx-title mt-3 text-xl">{a.name}</h3>
                  <p className="hx-mute mt-1 text-sm">{a.text}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Ranks */}
        <section id="rangos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
          <Reveal>
            <p className="hx-kicker">La escalera</p>
            <h2 className="hx-title mt-1 text-3xl sm:text-4xl">De Hierro a Retador</h2>
            <p className="hx-mute mt-2 max-w-2xl">Cada quiz te da XP. Cada división es un escalón. Falla, repasa y vuelve a subir.</p>
          </Reveal>
          <Stagger className="hx-panel hx-panel-soft mt-8 grid grid-cols-2 gap-4 p-6 sm:grid-cols-5" gap={0.06}>
            {TIERS.map((t, i) => (
              <StaggerItem key={t.id}>
                <div className="hx-lift flex flex-col items-center text-center">
                  <RankEmblem tierIndex={i} division={t.divisions ? 1 : null} size={92} />
                  <p className="mt-1 font-[family-name:var(--font-cinzel)] text-sm font-bold uppercase tracking-wider" style={{ color: t.glow }}>
                    {t.name}
                  </p>
                  <p className="hx-mute text-xs">{t.min.toLocaleString("es-CO")} XP</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Conquest + achievements */}
        <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <div className="hx-panel h-full p-6">
              <p className="hx-kicker">Mapa de conquista</p>
              <h2 className="hx-title mt-1 text-2xl sm:text-3xl">Cada tema es un territorio</h2>
              <p className="hx-mute mt-2 text-sm">Sube la maestría de un tema hasta Oro y es tuyo. Los aciertos pesan por tu precisión: adivinar no cuenta.</p>
              <ul className="mt-5 space-y-3">
                {DEMO_TOPICS.map((t) => (
                  <li key={t.name} className="flex items-center gap-3 bg-white/5 p-3">
                    <RankEmblem tierIndex={t.tier} size={48} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-bold">{t.name}</p>
                        {t.conquered && <span className="text-xs font-bold text-[#2fd68f]">🏰 Conquistado</span>}
                      </div>
                      <div className="hx-bar mt-1.5">
                        <span style={{ width: `${t.pct}%` }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="hx-panel h-full p-6">
              <p className="hx-kicker">Logros</p>
              <h2 className="hx-title mt-1 text-2xl sm:text-3xl">Cuatro niveles por logro</h2>
              <p className="hx-mute mt-2 text-sm">De Común a Legendario, como en tus juegos favoritos. Suma puntos de logro y presume tu vitrina.</p>
              <ul className="mt-5 space-y-3">
                {ACHIEVEMENTS.slice(4, 8).map((a, i) => {
                  const r = RARITIES[[0, 2, 3, 4][i]];
                  return (
                    <li key={a.id} className="flex items-center gap-3 bg-white/5 p-3" style={{ borderLeft: `3px solid ${r.color}` }}>
                      <span className="grid h-12 w-12 shrink-0 place-items-center text-2xl" style={{ background: `${r.color}22`, border: `1.5px solid ${r.color}`, clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)" }} aria-hidden>
                        {a.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{a.name}</span>
                        <span className="block text-xs font-bold uppercase tracking-wider" style={{ color: r.color }}>
                          {r.name}
                        </span>
                      </span>
                      <span className="hx-mute shrink-0 text-xs">{a.text(a.goals[[0, 1, 2, 3][i]])}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* Companions */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Reveal>
            <p className="hx-kicker">Compañeros</p>
            <h2 className="hx-title mt-1 text-3xl sm:text-4xl">Elige quién te acompaña</h2>
            <p className="hx-mute mt-2">21 criaturas animadas reaccionan a cada acierto y a cada error.</p>
          </Reveal>
          <Stagger className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7" gap={0.03}>
            {MASCOTS.map((m) => (
              <StaggerItem key={m.id}>
                <div className="hx-panel hx-lift p-3 text-center">
                  <p className="text-4xl" aria-hidden>
                    {m.emoji}
                  </p>
                  <p className="mt-1 truncate text-xs font-bold">{m.label}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20 pt-6 sm:px-6">
          <Reveal>
            <div className="hx-panel mx-auto max-w-4xl px-6 py-14 text-center">
              <p className="hx-kicker">Tu próximo examen te espera</p>
              <h2 className="hx-title mt-2 text-3xl sm:text-5xl">
                Releer no te dice <span className="hx-gold-text">qué no dominas</span>
              </h2>
              <p className="hx-mute mx-auto mt-3 max-w-xl">Un quiz sí. Crea tu cuenta, juega tu primera misión y ve en qué rango empiezas.</p>
              <Link href="/login?tab=registro" className="hx-btn hx-btn-gold hx-shine mt-8 !px-10 !py-4 text-lg">
                Crear cuenta gratis
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-[#785a28]/50 py-6 text-center text-sm hx-mute">Repasa · Tus apuntes, convertidos en una arena de estudio.</footer>
    </div>
  );
}
