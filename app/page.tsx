import Link from "next/link";
import { LinkButton } from "@/components/ui";
import { HeroScene } from "@/components/three/lazy";
import { KineticTitle } from "@/components/motion/kinetic-title";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { Marquee } from "@/components/motion/marquee";

const TOPICS = [
  "Node.js", "Bases de datos", "Biología", "Cálculo", "Historia", "React", "Química",
  "Estadística", "Economía", "Física", "Anatomía", "Derecho", "Python", "Inglés",
];

function StaticHeroCard() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-sm rotate-2 rounded-2xl border border-line bg-card p-6 shadow-xl">
      <p className="text-sm font-bold uppercase tracking-widest text-blue">Quiz · Frontend</p>
      <p className="mt-2 font-display text-xl font-bold">¿Qué etiqueta crea un enlace?</p>
      <ul className="mt-4 space-y-2.5">
        <li className="rounded-lg border-2 border-line px-3 py-2">A. &lt;p&gt;</li>
        <li className="rounded-lg border-2 border-green bg-green-soft px-3 py-2 font-bold">B. &lt;a&gt; · Correcta</li>
        <li className="rounded-lg border-2 border-line px-3 py-2">C. &lt;img&gt;</li>
      </ul>
    </div>
  );
}

export default function Landing() {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/75 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="font-display text-2xl font-bold">
            Repasa
          </Link>
          <div className="flex items-center gap-2 sm:gap-5">
            <a href="#como-funciona" className="hidden text-ink-soft hover:text-ink sm:inline">
              Cómo funciona
            </a>
            <Link href="/login" className="font-bold text-blue hover:underline">
              Iniciar sesión
            </Link>
            <span className="hidden sm:block">
              <LinkButton href="/login?tab=registro">Crear cuenta</LinkButton>
            </span>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="grain relative overflow-hidden">
          <div aria-hidden className="aurora pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem] opacity-50" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full bg-yellow px-3 py-1 text-sm font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink opacity-50" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-ink" />
                  </span>
                  Estudia con IA
                </span>
              </Reveal>
              <KineticTitle
                text="Convierte tus apuntes en quizzes"
                highlight={["apuntes"]}
                className="mt-5 text-4xl font-extrabold leading-tight sm:text-6xl"
              />
              <Reveal delay={0.5}>
                <p className="mt-5 max-w-xl text-lg text-ink-soft sm:text-xl">
                  Sube un PDF, pega tus notas o pide a la IA que las escriba. Practica con preguntas y descubre qué repasar.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <LinkButton href="/login?tab=registro" className="px-6 py-3 text-lg shadow-lg shadow-blue/30">
                    Empezar gratis
                  </LinkButton>
                  <LinkButton href="#como-funciona" variant="outline" className="px-6 py-3 text-lg">
                    Ver cómo funciona
                  </LinkButton>
                </div>
              </Reveal>
            </div>

            <div className="relative h-[340px] sm:h-[420px] lg:h-[480px]">
              <HeroScene
                fallback={
                  <div className="grid h-full place-items-center">
                    <StaticHeroCard />
                  </div>
                }
              />
            </div>
          </div>

          <Reveal delay={0.7}>
            <Marquee items={TOPICS} />
          </Reveal>
        </section>

        {/* How it works: bento grid */}
        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-widest text-blue">Cómo funciona</p>
            <h2 className="mt-1 text-3xl font-bold sm:text-4xl">De tus notas al repaso, en un ciclo</h2>
          </Reveal>

          <Stagger className="mt-10 grid gap-4 md:grid-cols-6">
            <StaggerItem className="md:col-span-4">
              <SpotlightCard className="h-full rounded-3xl border border-line bg-card p-7">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-blue font-display text-lg font-bold text-white">1</span>
                <h3 className="mt-4 font-display text-2xl font-bold">Guarda tus apuntes</h3>
                <p className="mt-2 max-w-md text-ink-soft">
                  Escríbelos, súbelos en PDF o Word, o deja que la IA redacte un apunte especializado del tema que necesitas.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold">
                  {["📎 PDF / Word", "💡 Crear con IA", "✍️ Escribir"].map((t) => (
                    <span key={t} className="rounded-full bg-paper-dark px-3 py-1">{t}</span>
                  ))}
                </div>
              </SpotlightCard>
            </StaggerItem>
            <StaggerItem className="md:col-span-2">
              <SpotlightCard className="h-full rounded-3xl border border-yellow bg-yellow-soft p-7">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-ink font-display text-lg font-bold text-yellow">2</span>
                <h3 className="mt-4 font-display text-2xl font-bold">Genera un quiz con IA</h3>
                <p className="mt-2 text-ink-soft">5, 10 o 15 preguntas. Fácil, media o difícil.</p>
              </SpotlightCard>
            </StaggerItem>
            <StaggerItem className="md:col-span-2">
              <SpotlightCard className="h-full rounded-3xl border border-line bg-card p-7">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-blue font-display text-lg font-bold text-white">3</span>
                <h3 className="mt-4 font-display text-2xl font-bold">Juega y suma racha</h3>
                <p className="mt-2 text-ink-soft">Puntos, rachas 🔥 y explicación inmediata en cada respuesta.</p>
              </SpotlightCard>
            </StaggerItem>
            <StaggerItem className="md:col-span-4">
              <SpotlightCard className="relative h-full overflow-hidden rounded-3xl bg-ink p-7 text-white">
                <div aria-hidden className="aurora pointer-events-none absolute -inset-16 opacity-40" />
                <div className="relative">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-yellow font-display text-lg font-bold text-ink">4</span>
                  <h3 className="mt-4 font-display text-2xl font-bold">Refuerza lo que fallaste</h3>
                  <p className="mt-2 max-w-md text-white/80">
                    Al terminar, la IA crea un quiz nuevo solo con los conceptos que no dominaste. Y el dashboard te dice qué tema repasar primero.
                  </p>
                </div>
              </SpotlightCard>
            </StaggerItem>
          </Stagger>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20 sm:px-6">
          <Reveal>
            <div className="grain relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-blue px-6 py-14 text-center text-white sm:px-12">
              <div aria-hidden className="aurora pointer-events-none absolute -inset-20 opacity-50" />
              <div className="relative">
                <h2 className="text-3xl font-bold sm:text-4xl">Releer apuntes no te dice qué no dominas.</h2>
                <p className="mx-auto mt-3 max-w-xl text-white/85">Un quiz sí. Empieza con tu próximo examen.</p>
                <LinkButton href="/login?tab=registro" variant="ai" className="mt-7 px-7 py-3 text-lg">
                  Crear cuenta gratis
                </LinkButton>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-sm text-muted">
        Repasa · Tus apuntes, convertidos en práctica.
      </footer>
    </>
  );
}
