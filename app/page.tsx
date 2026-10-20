import Link from "next/link";
import { LinkButton } from "@/components/ui";

const STEPS = [
  { n: 1, title: "Guarda", text: "tus apuntes por tema", ai: false },
  { n: 2, title: "Genera", text: "un quiz con IA", ai: true },
  { n: 3, title: "Repasa", text: "lo que más te cuesta", ai: false },
];

export default function Landing() {
  return (
    <>
      <header className="border-b border-line bg-card">
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
            <LinkButton href="/login?tab=registro" className="hidden sm:inline-flex">
              Crear cuenta
            </LinkButton>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div>
            <span className="inline-block rounded-full bg-yellow px-3 py-1 text-sm font-bold">
              Estudia con IA
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-6xl">
              Convierte tus <span className="highlight">apuntes</span> en quizzes
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft sm:text-xl">
              Pega tus notas, practica con preguntas y descubre qué repasar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/login?tab=registro" className="px-6 py-3 text-lg">
                Empezar gratis
              </LinkButton>
              <LinkButton href="#como-funciona" variant="outline" className="px-6 py-3 text-lg">
                Ver cómo funciona
              </LinkButton>
            </div>
          </div>

          <div aria-hidden className="mx-auto w-full max-w-sm rotate-2 rounded-2xl border border-line bg-card p-6 shadow-xl">
            <p className="text-sm font-bold uppercase tracking-widest text-blue">Quiz · Frontend</p>
            <p className="mt-2 font-display text-xl font-bold">¿Qué etiqueta crea un enlace?</p>
            <ul className="mt-4 space-y-2.5">
              <li className="rounded-lg border-2 border-line px-3 py-2">A. &lt;p&gt;</li>
              <li className="rounded-lg border-2 border-green bg-green-soft px-3 py-2 font-bold">
                B. &lt;a&gt; · Correcta
              </li>
              <li className="rounded-lg border-2 border-line px-3 py-2">C. &lt;img&gt;</li>
            </ul>
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-8 px-4 pb-20 sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">Cómo funciona</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li
                key={s.n}
                className={`rounded-2xl border p-6 ${
                  s.ai ? "border-yellow bg-yellow-soft" : "border-line bg-card"
                }`}
              >
                <p className={`font-display text-xl font-bold ${s.ai ? "text-ink" : "text-blue"}`}>
                  {s.n}. {s.title}
                </p>
                <p className="mt-1 text-ink-soft">{s.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-card p-6">
              <p className="text-sm font-bold uppercase tracking-widest text-red">El problema</p>
              <p className="mt-2 font-display text-xl font-bold">
                Releer apuntes NO te dice qué temas no dominas.
              </p>
            </div>
            <div className="rounded-2xl border border-blue bg-blue-soft p-6">
              <p className="text-sm font-bold uppercase tracking-widest text-blue">La solución</p>
              <p className="mt-2 font-display text-xl font-bold">
                Practica con preguntas de tus propias notas y mira tu puntaje por tema.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center text-sm text-muted">
        Repasa · Tus apuntes, convertidos en práctica.
      </footer>
    </>
  );
}
