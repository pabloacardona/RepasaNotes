"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Button, Spinner } from "@/components/ui";
import { burstAt } from "@/components/confetti";
import { pointsFor } from "@/lib/score";
import { moodFor } from "@/lib/mood";
import { InteractiveBackdrop } from "@/components/world/interactive-backdrop";
import { MascotStage } from "@/components/world/mascot-stage";
import { MascotPicker } from "@/components/world/mascot-picker";
import type { Question } from "@/lib/db/schema";

const LETTERS = ["A", "B", "C", "D"];
const CHEERS = ["¡Bien hecho!", "¡Exacto!", "¡Lo tienes!", "¡Crack!", "¡Perfecto!", "¡Así se hace!"];
const STREAK_CHEERS = ["¡En racha!", "¡Imparable!", "¡Estás on fire!", "¡Nadie te para!"];
const NUDGES = ["¡Casi! Lee la explicación.", "No pasa nada, así se aprende.", "Ups. Esta va para el repaso.", "¡La próxima sale!"];

type Feedback = { kind: "hit" | "miss"; message: string; gained: number; key: number };
type Dialog = "restart" | "finish" | null;

// What the mascot remembers about recent answers.
type Track = {
  missStreak: number;
  brokenStreak: number;
  missStreakBefore: number;
  lastResult: "hit" | "miss" | null;
  answeredAt: number; // seconds on the quiz clock
  questionStart: number;
  pulse: number;
};
const TRACK0: Track = { missStreak: 0, brokenStreak: 0, missStreakBefore: 0, lastResult: null, answeredAt: -99, questionStart: 0, pulse: 0 };

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
  const reduce = useReducedMotion();
  const [direction, setDirection] = useState(1);
  const [track, setTrack] = useState<Track>(TRACK0);

  const q = questions[current];
  const chosen = answers[current];
  const answered = chosen !== -1;
  const isLast = current === questions.length - 1;
  const answeredCount = answers.filter((a) => a !== -1).length;
  const unanswered = questions.length - answeredCount;
  const hits = answers.filter((a, i) => a !== -1 && a === questions[i].correctIndex).length;

  const mood = moodFor({
    total: questions.length,
    answered: answeredCount,
    hits,
    streak,
    missStreak: track.missStreak,
    brokenStreak: track.brokenStreak,
    missStreakBefore: track.missStreakBefore,
    lastResult: track.lastResult,
    msSinceAnswer: (seconds - track.answeredAt) * 1000,
    msOnQuestion: (seconds - track.questionStart) * 1000,
    currentAnswered: answered,
    finished: submitting,
  });
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
        setTrack((tr) => ({ ...tr, missStreakBefore: tr.missStreak, missStreak: 0, brokenStreak: 0, lastResult: "hit", answeredAt: seconds, pulse: tr.pulse + 1 }));
      } else {
        setTrack((tr) => ({ ...tr, missStreakBefore: 0, missStreak: tr.missStreak + 1, brokenStreak: streak, lastResult: "miss", answeredAt: seconds, pulse: tr.pulse + 1 }));
        setStreak(0);
        setFeedback({ kind: "miss", message: pick(NUDGES), gained: 0, key: Date.now() });
      }
    },
    [answers, current, dialog, q.correctIndex, streak, seconds],
  );

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= questions.length) return;
      setDirection(i >= current ? 1 : -1);
      setCurrent(i);
      setFeedback(null);
      setTrack((tr) => ({ ...tr, questionStart: seconds }));
    },
    [current, questions.length, seconds],
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
    setTrack(TRACK0);
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
    <div className="flex h-dvh flex-col overflow-hidden">
      <InteractiveBackdrop streak={streak} pulse={track.pulse} lastHit={track.lastResult === null ? null : track.lastResult === "hit"} />
      <MascotStage
        mood={mood}
        pulse={track.pulse}
        lastHit={track.lastResult === null ? null : track.lastResult === "hit"}
        streak={streak}
        className="fixed left-1/2 top-[3.6rem] z-0 h-[25dvh] w-[min(70vw,280px)] -translate-x-1/2 landscape:left-auto landscape:right-4 landscape:top-20 landscape:h-[min(68dvh,540px)] landscape:w-[min(38vw,460px)] landscape:translate-x-0 sm:landscape:right-8"
      />
      <header className="z-20 shrink-0 bg-ink/80 text-white backdrop-blur-md">
        <div className="flex items-center gap-2 px-3 py-2 sm:gap-4 sm:px-6">
          <span className="hidden font-display text-xl font-bold text-yellow lg:inline">Repasa</span>
          <div
            className="h-2.5 min-w-16 flex-1 overflow-hidden rounded-full bg-white/20"
            role="progressbar"
            aria-label="Progreso del quiz"
            aria-valuenow={answeredCount}
            aria-valuemin={0}
            aria-valuemax={questions.length}
          >
            <motion.div
              className="h-full rounded-full bg-yellow"
              initial={false}
              animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
          <Chip label="Puntos" bumpKey={feedback?.kind === "hit" ? feedback.key : 0}>
            <AnimatedNumber value={points} />
            {feedback?.kind === "hit" && (
              <span key={feedback.key} className="anim-float-up absolute -top-2 right-0 text-xs font-bold text-green">
                +{feedback.gained}
              </span>
            )}
          </Chip>
          <Chip label="XP" bumpKey={feedback?.kind === "hit" ? feedback.key : 0}>
            {Math.round(points / 10)}
          </Chip>
          <Chip label="Racha" bumpKey={feedback?.kind === "hit" ? feedback.key : 0} hot={streak >= 3}>
            {streak > 0 ? `🔥${streak}` : "—"}
          </Chip>
          <Chip label="Aciertos">
            {hits}/{questions.length}
          </Chip>
          <span className="hidden tabular-nums text-sm text-white/75 sm:inline" aria-label="Tiempo">
            ⏱ {formatTime(seconds)}
          </span>
          <Link href="/quizzes" className="whitespace-nowrap text-sm text-white/85 hover:text-white">
            Salir
          </Link>
        </div>
        <div className="h-1 bg-yellow" />
      </header>

      {/* Portrait: the top band shows the scene. Landscape: the right side does. */}
      <main className="flex min-h-0 flex-1 px-2 pb-2 pt-[27dvh] sm:px-6 sm:pb-4 landscape:pt-3 sm:landscape:pt-4">
        <MascotPicker className="right-3 top-16" />
        <div className="flex max-h-full min-h-0 w-full flex-col self-start landscape:max-w-[min(600px,56vw)] portrait:max-w-[600px] rounded-3xl border border-white/40 bg-paper/90 p-3 shadow-2xl backdrop-blur-xl sm:p-5">
          <ComboMeter streak={streak} points={points} hit={feedback?.kind === "hit" ? feedback.key : 0} />
          {/* Question dots */}
          <nav aria-label="Preguntas" className="flex shrink-0 flex-wrap gap-1">
            {questions.map((qq, i) => {
              const a = answers[i];
              const state = a === -1 ? "pending" : a === qq.correctIndex ? "hit" : "miss";
              return (
                <motion.button
                  key={i}
                  layout
                  whileHover={reduce ? undefined : { scale: 1.12 }}
                  whileTap={reduce ? undefined : { scale: 0.9 }}
                  onClick={() => goTo(i)}
                  aria-label={`Pregunta ${i + 1}${state === "hit" ? ", correcta" : state === "miss" ? ", incorrecta" : ""}`}
                  aria-current={i === current ? "step" : undefined}
                  className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition ${
                    state === "hit"
                      ? "bg-green text-white"
                      : state === "miss"
                        ? "bg-red text-white"
                        : "border-2 border-line bg-card text-ink-soft hover:border-blue"
                  } ${i === current ? "ring-2 ring-blue ring-offset-2 ring-offset-paper" : ""}`}
                >
                  {state === "hit" ? "✓" : state === "miss" ? "✗" : i + 1}
                </motion.button>
              );
            })}
          </nav>

          <div className="mb-1.5 mt-2 flex shrink-0 items-center justify-between gap-2 text-xs sm:text-sm">
            <p className="truncate text-muted">
              {topic} · {title}
            </p>
            <p className="shrink-0 font-bold">
              {current + 1} / {questions.length}
            </p>
          </div>

          {/* Only this area scrolls, and only if a long question does not fit. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.section
                key={current}
                custom={direction}
                initial={reduce ? false : { opacity: 0, x: 60 * direction, rotate: 1.5 * direction }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: -60 * direction, rotate: -1.5 * direction }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                className={`rounded-2xl border border-line bg-card p-3 sm:p-5 ${feedback?.kind === "miss" ? "anim-shake" : ""}`}
              >
                <h1 className="text-base font-bold leading-snug sm:text-xl">{q.question}</h1>
                <ul className="mt-3 space-y-2">
                  {q.options.map((opt, i) => {
                    const isCorrect = i === q.correctIndex;
                    const isChosen = i === chosen;
                    let style = "border-line hover:-translate-y-0.5 hover:border-blue hover:bg-blue-soft hover:shadow-md";
                    let tag: React.ReactNode = null;
                    if (answered) {
                      if (isCorrect) {
                        style = `border-green bg-green-soft ${isChosen ? "anim-pop" : ""}`;
                        tag = <span className="shrink-0 text-sm font-bold text-green">✓ Correcta</span>;
                      } else if (isChosen) {
                        style = "border-red bg-red-soft";
                        tag = <span className="shrink-0 text-sm font-bold text-red">✗ Incorrecta</span>;
                      } else {
                        style = "border-line opacity-60";
                      }
                    }
                    return (
                      <li key={i} className="anim-rise" style={{ animationDelay: `${i * 50}ms` }}>
                        <motion.button
                          whileTap={answered || reduce ? undefined : { scale: 0.97 }}
                          ref={(el) => {
                            optionRefs.current[i] = el;
                          }}
                          onClick={() => choose(i)}
                          disabled={answered}
                          title={`Tecla ${i + 1} o ${LETTERS[i]}`}
                          className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left text-sm transition disabled:cursor-default sm:py-2.5 sm:text-base ${style}`}
                        >
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg font-display font-bold ${
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
                        </motion.button>
                      </li>
                    );
                  })}
                </ul>

                <div aria-live="polite">
                  {answered && (
                    <div className="anim-rise mt-3 space-y-2">
                      {feedback && (
                        <p className={`font-display font-bold ${feedback.kind === "hit" ? "text-green" : "text-red"}`}>{feedback.message}</p>
                      )}
                      <div className="rounded-lg border-l-4 border-yellow bg-yellow-soft px-3 py-2 text-sm sm:text-base">
                        <span className="font-bold">Explicación:</span> {q.explanation}
                      </div>
                    </div>
                  )}
                </div>
              </motion.section>
            </AnimatePresence>
          </div>

          {error && (
            <p role="alert" className="mt-2 shrink-0 rounded-lg bg-red-soft px-3 py-2 text-sm font-bold text-red">
              {error}
            </p>
          )}

          {/* Controls: always visible */}
          <div className="mt-2 flex shrink-0 items-center gap-2">
            <Button variant="outline" onClick={() => goTo(current - 1)} disabled={current === 0} className="px-3 py-2" aria-label="Anterior">
              ←<span className="hidden sm:inline">Anterior</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDialog("restart")}
              disabled={answeredCount === 0 || submitting}
              className="px-2.5 py-2 text-sm"
              title="Empezar de nuevo"
            >
              ↺<span className="hidden md:inline">Reiniciar</span>
            </Button>
            <Button variant="danger" onClick={() => setDialog("finish")} disabled={submitting} className="px-2.5 py-2 text-sm" title="Finalizar quiz">
              ⏹<span className="hidden md:inline">Finalizar</span>
            </Button>
            <div className="flex-1" />
            {isLast ? (
              <Button onClick={() => (unanswered > 0 ? setDialog("finish") : finish())} disabled={submitting} className="px-4 py-2">
                {submitting && <Spinner />}
                Ver resultados
              </Button>
            ) : (
              <Button onClick={() => goTo(current + 1)} className={`px-4 py-2 ${answered ? "anim-pop" : ""}`} key={String(answered)}>
                Siguiente →
              </Button>
            )}
          </div>
        </div>
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

// Combo bar: five segments fill with the streak; at five the bar burns.
function ComboMeter({ streak, points, hit }: { streak: number; points: number; hit: number }) {
  const segs = Math.min(streak, 5);
  const hot = streak >= 5;
  return (
    <div className="mb-2 flex shrink-0 items-center gap-2" aria-label={`Combo ${streak}`}>
      <span key={hit} className={`font-display text-sm font-extrabold ${hot ? "text-orange-500" : "text-ink-soft"} ${hit ? "anim-pop" : ""}`}>
        {hot ? "🔥" : streak > 0 ? "⚡" : "·"} Combo x{Math.max(streak, 1)}
      </span>
      <div className="flex flex-1 gap-1" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              i < segs ? (hot ? "bg-gradient-to-r from-yellow to-orange-500" : "bg-yellow") : "bg-paper-dark"
            } ${i < segs && hit ? "scale-y-150" : ""}`}
          />
        ))}
      </div>
      <span className="text-xs font-bold tabular-nums text-ink-soft">+{Math.round(points / 10)} XP</span>
    </div>
  );
}

function Chip({ label, children, bumpKey = 0, hot = false }: { label: string; children: React.ReactNode; bumpKey?: number; hot?: boolean }) {
  return (
    <div
      className={`relative flex shrink-0 flex-col items-center rounded-lg px-2 py-0.5 leading-tight sm:px-3 ${hot ? "bg-yellow text-ink" : "bg-white/10"}`}
      aria-label={label}
    >
      <span className="hidden text-[10px] font-bold uppercase tracking-wider opacity-70 sm:block">{label}</span>
      <span key={bumpKey} className={`font-display text-sm font-bold tabular-nums sm:text-base ${bumpKey ? "anim-pop" : ""}`}>
        {children}
      </span>
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
