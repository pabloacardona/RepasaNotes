import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listQuizzes } from "@/lib/data";
import { DIFFICULTY_LABEL } from "@/lib/validators";
import { Card, LinkButton, PageHeader, formatDate } from "@/components/ui";

export const metadata: Metadata = { title: "Quizzes" };

export default async function QuizzesPage() {
  const user = await requireUser();
  const quizzes = await listQuizzes(user.sub);

  return (
    <>
      <PageHeader title="Mis quizzes" action={<LinkButton href="/quizzes/nuevo">+ Nuevo quiz</LinkButton>} />
      {quizzes.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-display text-xl font-bold">Aún no has generado quizzes</p>
          <p className="mt-2 text-ink-soft">Elige un apunte y deja que la IA cree las preguntas.</p>
          <LinkButton href="/quizzes/nuevo" variant="ai" className="mt-6">Generar quiz</LinkButton>
        </Card>
      ) : (
        <ul className="space-y-3">
          {quizzes.map((q) => {
            const done = q.completedAt !== null;
            const pct = done ? Math.round(((q.score ?? 0) / q.total) * 100) : null;
            return (
              <li key={q.id}>
                <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0">
                    <Link
                      href={done ? `/quizzes/${q.id}` : `/quiz/${q.id}`}
                      className="font-display text-lg font-bold hover:underline"
                    >
                      {q.title}
                    </Link>
                    <p className="text-ink-soft">
                      {q.topic} · {q.total} preguntas · {DIFFICULTY_LABEL[q.difficulty] ?? q.difficulty} ·{" "}
                      {formatDate(q.createdAt)}
                    </p>
                  </div>
                  {done ? (
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 font-bold ${
                          pct! >= 70 ? "bg-green-soft text-green" : pct! >= 50 ? "bg-yellow-soft" : "bg-red-soft text-red"
                        }`}
                      >
                        {q.score}/{q.total} · {pct}%
                      </span>
                      <LinkButton href={`/quizzes/${q.id}`} variant="ghost" className="py-2">
                        Ver resultados
                      </LinkButton>
                    </div>
                  ) : (
                    <LinkButton href={`/quiz/${q.id}`} className="py-2">
                      Resolver
                    </LinkButton>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
