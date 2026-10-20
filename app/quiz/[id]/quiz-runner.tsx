"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { burstAt } from "@/components/confetti";
import { pointsFor } from "@/lib/score";
import type { Question } from "@/lib/db/schema";

const LETTERS = ["A", "B", "C", "D"];
const CHEERS = ["¡Bien hecho!", "¡Exacto!", "¡Lo tienes!", "¡Crack!", "¡Perfecto!", "¡Así se hace!"];
const STREAK_CHEERS = ["¡En racha!", "¡Imparable!", "¡Estás on fire!", "¡Nadie te para!"];
const NUDGES = ["¡Casi! Lee la explicación.", "No pasa nada, así se aprende.", "Ups. Esta va para el repaso.", "¡La próxima sale!"];

type Feedback = { kind: "hit" | "miss"; message: string; gained: number; key: number };
type Dialog = "restart" | "finish" | null;

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function QuizRunner({
  id,
  title,
  topic,
  questions,
}: {
  id: string;
  title: string;
  topic: string;
  questions: Question[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const q = questions[current];
  const chosen = answers[current];
  const answered = chosen !== -1;
  const isLast = current === questions.length - 1;
  const answeredCount = answers.filter((a) => a !== -1).length;
  const unanswered = questions.length - answeredCount;
  const hits = answers.filter((a, i) => a !== -1 && a === questions[i].correctIndex).length;

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const choose = useCallback(
    (i: number) => {
      if (answers[current] !== -1 || dialog) return;
      setAnswers((a) => a.map((v, idx) => (idx === current ? i : v)));
      if (i === q.correctIndex) {
        const next = streak + 1;
        const gained = pointsFor(next);
        setStreak(next);
        setPoints((p) => p + gained);
        setFeedback({
          kind: "hit",
          message: next >= 3 ? `${pick(STREAK_CHEERS)} 🔥 x${next}` : pick(CHEERS),
          gained,
          key: Date.now(),
        });
        burstAt(optionRefs.current[i]);
      } else {
        setStreak(0);
        setFeedback({ kind: "miss", message: pick(NUDGES), gained: 0, key: Date.now() });
      }
    },
    [answers, current, dialog, q.correctIndex, streak],
  );

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= questions.length) return;
      setCurrent(i);
      setFeedback(null);
    },
    [questions.length],
  );

  async function finish() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/quizzes/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setSubmitting(false);
      setDialog(null);
      return setError("No se pudieron guardar tus respuestas. Intenta de nuevo.");
    }
    router.push(`/quizzes/${id}?nuevo=1`);
    router.refresh();
  }

  function restart() {
    setAnswers(questions.map(() => -1));
    setPoints(0);
    setStreak(0);
    setSeconds(0);
    setFeedback(null);
    setCurrent(0);
    setDialog(null);
    setError(null);
  }

  // Keyboard: 1-4 / A-D answer, arrows or Enter navigate, Esc closes dialogs.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (dialog) {
        if (e.key === "Escape") setDialog(null);
        return;
      }
      const k = e.key.toLowerCase();
      const idx = ["1", "2", "3", "4"].indexOf(k) !== -1 ? Number(k) - 1 : ["a", "b", "c", "d"].indexOf(k);
      if (idx >= 0 && idx < q.options.length) {
        e.preventDefault();
        choose(idx);
      } else if (e.key === "ArrowRight" || (e.key === "Enter" && answered && !isLast)) {
        goTo(current + 1);
      } else if (e.key === "ArrowLeft") {
        goTo(current - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, choose, current, dialog, goTo, isLast, q.options.length]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 bg-ink text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <span className="hidden font-display text-2xl font-bold text-yellow sm:inline">Repasa</span>
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/20"
            role="progressbar"
            aria-label="Progreso del quiz"
            aria-valuenow={answeredCount}
            aria-valuemin={0}
            aria-valuemax={questions.length}
          >
            <div
              className="h-full rounded-full bg-yellow transition-all duration-500"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
          <span className="tabular-nums text-sm text-white/75" aria-label="Tiempo">
            ⏱ {formatTime(seconds)}
          </span>
          <Link href="/quizzes" className="whitespace-nowrap text-sm text-white/85 hover:text-white">
            Salir
          </Link>
        </div>
        <div className="h-1 bg-yellow" />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 sm:px-6">
        {/* Score bar */}
        <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
          <Stat label="Puntos" value={points.toLocaleString("es-CO")} bumpKey={feedback?.kind === "hit" ? feedback.key : 0}>
            {feedback?.kind === "hit" && (
              <span key={feedback.key} className="anim-float-up absolute -top-1 right-2 font-bold text-green">
                +{feedback.gained}
              </span>
            )}
          </Stat>
          <Stat
            label="Racha"
            value={streak > 0 ? `🔥 ${streak}` : "—"}
            bumpKey={feedback?.kind === "hit" ? feedback.key : 0}
            highlight={streak >= 3}
          />
          <Stat label="Aciertos" value={`${hits}/${questions.length}`} />
        </div>

        {/* Question dots */}
        <nav aria-label="Preguntas" className="mb-4 flex flex-wrap gap-1.5">
          {questions.map((qq, i) => {
            const a = answers[i];
            const state = a === -1 ? "pending" : a === qq.correctIndex ? "hit" : "miss";
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Pregunta ${i + 1}${state === "hit" ? ", correcta" : state === "miss" ? ", incorrecta" : ""}`}
                aria-current={i === current ? "step" : undefined}
                className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition ${
                  state === "hit"
                    ? "bg-green text-white"
                    : state === "miss"
                      ? "bg-red text-white"
                      : "border-2 border-line bg-card text-ink-soft hover:border-blue"
                } ${i === current ? "ring-3 ring-blue ring-offset-2 ring-offset-paper" : ""}`}
              >
                {state === "hit" ? "✓" : state === "miss" ? "✗" : i + 1}
              </button>
            );
          })}
        </nav>

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted">
            {topic} · {title}
          </p>
          <p className="font-bold">
            Pregunta {current + 1} de {questions.length}
          </p>
        </div>

        <section
          key={current}
          className={`anim-slide-in rounded-2xl border border-line bg-card p-5 sm:p-6 ${
            feedback?.kind === "miss" ? "anim-shake" : ""
          }`}
        >
          <h1 className="text-xl font-bold leading-snug sm:text-2xl">{q.question}</h1>
          <ul className="mt-5 space-y-2.5">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correctIndex;
              const isChosen = i === chosen;
              let style = "border-line hover:-translate-y-0.5 hover:border-blue hover:bg-blue-soft hover:shadow-md";
              let tag: React.ReactNode = null;
              if (answered) {
                if (isCorrect) {
                  style = `border-green bg-green-soft ${isChosen ? "anim-pop" : ""}`;
                  tag = <span className="font-bold text-green">✓ Correcta</span>;
                } else if (isChosen) {
                  style = "border-red bg-red-soft";
                  tag = <span className="font-bold text-red">✗ Incorrecta</span>;
                } else {
                  style = "border-line opacity-60";
                }
              }
              return (
                <li key={i} className="anim-rise" style={{ animationDelay: `${i * 50}ms` }}>
                  <button
                    ref={(el) => {
                      optionRefs.current[i] = el;
                    }}
                    onClick={() => choose(i)}
                    disabled={answered}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition disabled:cursor-default ${style}`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display font-bold ${
                        answered && isCorrect
                          ? "bg-green text-white"
                          : answered && isChosen
                            ? "bg-red text-white"
                            : "bg-paper-dark text-ink-soft"
                      }`}
                    >
                      {LETTERS[i]}
                    </span>
                    <span className={`flex-1 ${answered && (isCorrect || isChosen) ? "font-bold" : ""}`}>{opt}</span>
                    {tag}
                  </button>
                </li>
              );
            })}
          </ul>

          <div aria-live="polite">
            {answered && (
              <div className="anim-rise mt-5 space-y-3">
                {feedback && (
                  <p className={`font-display text-lg font-bold ${feedback.kind === "hit" ? "text-green" : "text-red"}`}>
                    {feedback.message}
                  </p>
                )}
                <div className="rounded-lg border-l-4 border-yellow bg-yellow-soft px-4 py-3">
                  <span className="font-bold">Explicación de la IA:</span> {q.explanation}
                </div>
              </div>
            )}
          </div>
        </section>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-soft px-3 py-2 font-bold text-red">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => goTo(current - 1)} disabled={current === 0}>
            ← Anterior
          </Button>
          {isLast ? (
            <Button onClick={() => (unanswered > 0 ? setDialog("finish") : finish())} disabled={submitting}>
              {submitting && <Spinner />}
              Ver resultados
            </Button>
          ) : (
            <Button onClick={() => goTo(current + 1)} className={answered ? "anim-pop" : ""} key={String(answered)}>
              Siguiente →
            </Button>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 border-t border-line pt-5">
          <Button variant="ghost" onClick={() => setDialog("restart")} disabled={answeredCount === 0 || submitting}>
            ↺ Empezar de nuevo
          </Button>
          <Button variant="danger" onClick={() => setDialog("finish")} disabled={submitting}>
            ⏹ Finalizar quiz
          </Button>
        </div>
        <p className="mt-3 hidden text-center text-xs text-muted sm:block">
          Atajos: teclas 1-4 o A-D para responder · ← → para moverte
        </p>
      </main>

      {dialog && (
        <ConfirmDialog
          title={dialog === "restart" ? "¿Empezar de nuevo?" : "¿Finalizar el quiz?"}
          body={
            dialog === "restart"
              ? "Se borran tus respuestas, puntos y racha de este intento."
              : unanswered > 0
                ? `Te ${unanswered === 1 ? "falta 1 pregunta" : `faltan ${unanswered} preguntas`}. Las que no respondas cuentan como incorrectas.`
                : "Guardaremos tus respuestas y verás tus resultados."
          }
          confirmLabel={dialog === "restart" ? "Sí, empezar de nuevo" : "Sí, finalizar"}
          loading={submitting}
          onCancel={() => setDialog(null)}
          onConfirm={dialog === "restart" ? restart : finish}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  bumpKey = 0,
  highlight = false,
  children,
}: {
  label: string;
  value: string;
  bumpKey?: number;
  highlight?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`relative rounded-xl border px-3 py-2 text-center transition ${
        highlight ? "border-yellow bg-yellow-soft" : "border-line bg-card"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p key={bumpKey} className={`font-display text-xl font-bold tabular-nums ${bumpKey ? "anim-pop" : ""}`}>
        {value}
      </p>
      {children}
    </div>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  loading,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="anim-fade-in fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="anim-rise w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="dialog-title" className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-ink-soft">{body}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading} autoFocus>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading && <Spinner />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
