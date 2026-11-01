import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getStats } from "@/lib/data";
import { getGameProfile } from "@/lib/game";
import { GameHub } from "@/components/game/game-hub";
import { Card, LinkButton } from "@/components/ui";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { AnimatedBar } from "@/components/motion/animated-bar";
import { AnimatedNumber } from "@/components/motion/animated-number";

export const metadata: Metadata = { title: "Inicio" };

export default async function Dashboard() {
  const user = await requireUser();
  const [stats, game] = await Promise.all([getStats(user.sub), getGameProfile(user.sub)]);
  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Bogota",
  });
  const firstName = user.name.split(" ")[0];
  const showWeakest = stats.weakest && stats.topics.length > 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted first-letter:uppercase">{today}</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Hola, {firstName}</h1>
        </div>
        <LinkButton href="/quizzes/nuevo">+ Nuevo quiz</LinkButton>
      </div>

      <GameHub profile={game} />

      <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StaggerItem>
          <Stat label="Quizzes realizados" value={<AnimatedNumber from={0} value={stats.quizzesDone} />} />
        </StaggerItem>
        <StaggerItem>
          <Stat
            label="Promedio general"
            value={stats.average === null ? "—" : <><AnimatedNumber from={0} value={stats.average} />%</>}
          />
        </StaggerItem>
        <StaggerItem className="col-span-2 sm:col-span-1">
          <Stat label="Apuntes guardados" value={<AnimatedNumber from={0} value={stats.notesCount} />} />
        </StaggerItem>
      </Stagger>

      <div className="mt-4 grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <h2 className="text-lg font-bold">Puntaje por tema</h2>
          {stats.topics.length === 0 ? (
            <EmptyTopics hasNotes={stats.notesCount > 0} />
          ) : (
            <ul className="mt-4 space-y-4">
              {stats.topics.map((t) => {
                const weak = t.topic === stats.weakest?.topic && stats.topics.length > 1;
                return (
                  <li key={t.topic} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_3rem] items-center gap-3">
                    <span className="truncate">{t.topic}</span>
                    <span
                      className="h-3 overflow-hidden rounded-full bg-paper-dark"
                      role="progressbar"
                      aria-valuenow={t.average}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${t.topic}: ${t.average}%`}
                    >
                      <AnimatedBar percent={t.average} className={weak ? "bg-red" : "bg-blue"} delay={0.1} />
                    </span>
                    <span className={`text-right font-bold ${weak ? "text-red" : ""}`}>{t.average}%</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {showWeakest ? (
          <Card className="border-yellow bg-yellow-soft p-6">
            <p className="text-sm font-bold uppercase tracking-widest">Por reforzar</p>
            <p className="mt-2 font-display text-2xl font-bold">{stats.weakest!.topic}</p>
            <p className="mt-1 text-ink-soft">
              Promedio {stats.weakest!.average}% en {stats.weakest!.attempts}{" "}
              {stats.weakest!.attempts === 1 ? "intento" : "intentos"}
            </p>
            <LinkButton
              variant="dark"
              href={`/quizzes/nuevo?tema=${encodeURIComponent(stats.weakest!.topic)}`}
              className="mt-4"
            >
              Repasar ahora
            </LinkButton>
          </Card>
        ) : (
          <Card className="border-yellow bg-yellow-soft p-6">
            <p className="text-sm font-bold uppercase tracking-widest">Primer paso</p>
            <p className="mt-2 font-display text-xl font-bold">
              {stats.notesCount === 0 ? "Guarda tu primer apunte" : "Genera tu primer quiz"}
            </p>
            <p className="mt-1 text-ink-soft">
              Cuando resuelvas quizzes verás aquí el tema que más te cuesta.
            </p>
            <LinkButton
              variant="dark"
              href={stats.notesCount === 0 ? "/apuntes/nuevo" : "/quizzes/nuevo"}
              className="mt-4"
            >
              {stats.notesCount === 0 ? "Crear apunte" : "Generar quiz"}
            </LinkButton>
          </Card>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="h-full p-5 transition hover:-translate-y-1 hover:shadow-lg">
      <p className="text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold sm:text-4xl">{value}</p>
    </Card>
  );
}

function EmptyTopics({ hasNotes }: { hasNotes: boolean }) {
  return (
    <p className="mt-4 text-ink-soft">
      {hasNotes
        ? "Aún no has resuelto quizzes. Genera uno desde tus apuntes para ver tu progreso."
        : "Aún no tienes datos. Empieza guardando un apunte."}
    </p>
  );
}
