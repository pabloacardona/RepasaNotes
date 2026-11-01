import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listQuizzes } from "@/lib/data";
import { DIFFICULTY_LABEL } from "@/lib/validators";
import { gradeFor } from "@/lib/ranks";
import { formatDate } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";

export const metadata: Metadata = { title: "Quizzes" };

const DIFF: Record<string, { icon: string; color: string }> = {
  facil: { icon: "🌿", color: "#2fd68f" },
  media: { icon: "⚔️", color: "#f0d89a" },
  dificil: { icon: "🐉", color: "#e8485f" },
};

export default async function QuizzesPage() {
  const user = await requireUser();
  const quizzes = await listQuizzes(user.sub);
  const done = quizzes.filter((q) => q.completedAt !== null);
  const pending = quizzes.length - done.length;
  const wins = done.filter((q) => q.total > 0 && (q.score ?? 0) / q.total >= 0.7).length;

  return (
    <>
      <Reveal>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="hx-kicker">Tablón de misiones</p>
            <h1 className="hx-title hx-gold-text text-3xl sm:text-4xl">Mis quizzes</h1>
            {quizzes.length > 0 && (
              <p className="hx-mute mt-1 text-sm">
                {wins} {wins === 1 ? "victoria" : "victorias"} · {done.length - wins} {done.length - wins === 1 ? "derrota" : "derrotas"} · {pending} {pending === 1 ? "misión pendiente" : "misiones pendientes"}
              </p>
            )}
          </div>
          <Link href="/quizzes/nuevo" className="hx-btn hx-btn-gold">
            + Nueva misión
          </Link>
        </div>
      </Reveal>

      {quizzes.length === 0 ? (
        <div className="hx-panel p-10 text-center">
          <p className="text-5xl" aria-hidden>🗺️</p>
          <p className="hx-title mt-3 text-2xl">Tu mapa está en blanco</p>
          <p className="hx-mute mt-2">Elige un apunte y deja que la IA forje tu primera misión.</p>
          <Link href="/quizzes/nuevo" className="hx-btn hx-btn-gold mt-6">
            Generar quiz
          </Link>
        </div>
      ) : (
        <Stagger className="space-y-3" gap={0.05}>
          {quizzes.map((q) => {
            const isDone = q.completedAt !== null;
            const pct = isDone ? Math.round(((q.score ?? 0) / q.total) * 100) : 0;
            const grade = gradeFor(pct);
            const d = DIFF[q.difficulty] ?? DIFF.media;
            const win = pct >= 70;
            return (
              <StaggerItem key={q.id}>
                <div className="hx-panel hx-panel-soft hx-lift">
                  <div className="flex items-center gap-4 p-4">
                    <div
                      className="grid h-16 w-16 shrink-0 place-items-center font-[family-name:var(--font-cinzel)] text-3xl font-black"
                      style={{
                        clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
                        background: isDone ? `linear-gradient(160deg, ${grade.color}, #0a1428 140%)` : "linear-gradient(160deg, #263247, #0a1428)",
                        color: isDone ? "#0a1428" : "#6b7385",
                      }}
                      title={isDone ? `Nota ${grade.letter}` : "Sin jugar"}
                    >
                      {isDone ? grade.letter : "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={isDone ? `/quizzes/${q.id}` : `/quiz/${q.id}`} className="block truncate font-[family-name:var(--font-cinzel)] text-lg font-bold hover:text-[#f0d89a]">
                        {q.title}
                      </Link>
                      <p className="hx-mute truncate text-sm">
                        {q.topic} · {q.total} preguntas · {formatDate(q.createdAt)}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold">
                        <span className="rounded-sm px-2 py-0.5" style={{ background: `${d.color}22`, color: d.color }}>
                          {d.icon} {DIFFICULTY_LABEL[q.difficulty] ?? q.difficulty}
                        </span>
                        {isDone ? (
                          <span className={win ? "text-[#2fd68f]" : "text-[#e8485f]"}>
                            {win ? "VICTORIA" : "DERROTA"} · {q.score}/{q.total} ({pct}%)
                          </span>
                        ) : (
                          <span className="text-[#0ac8b9]">MISIÓN PENDIENTE</span>
                        )}
                      </p>
                    </div>
                    <Link href={isDone ? `/quizzes/${q.id}` : `/quiz/${q.id}`} className={`hx-btn !px-4 !py-2 text-sm ${isDone ? "" : "hx-btn-cyan"}`}>
                      {isDone ? "Resultados" : "Jugar"}
                    </Link>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </>
  );
}
