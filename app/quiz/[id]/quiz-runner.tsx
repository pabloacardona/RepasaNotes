"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { StreakFlame } from "@/components/game/streak-flame";
import { FireBorder } from "@/components/game/fire-border";
import type { ComponentProps } from "react";
import { Spinner } from "@/components/ui";
import { burstAt } from "@/components/confetti";
import { pointsFor } from "@/lib/score";
import { moodFor } from "@/lib/mood";
import { ThemeToggle } from "@/components/theme-toggle";
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
  playerName,
}: {
  id: string;
  title: string;
  topic: string;
  questions: Question[];
  playerName?: string;
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

  const lastHit = track.lastResult === null ? null : track.lastResult === "hit";
  const xp = Math.round(points / 10);
  const comboHot = streak >= 3;

  return (
    <div className="hx flex h-dvh flex-col overflow-hidden">
      <InteractiveBackdrop streak={streak} pulse={track.pulse} lastHit={lastHit} />
      <MascotStage
        mood={mood}
        pulse={track.pulse}
        lastHit={lastHit}
        streak={streak}
        bubbleClassName="portrait:hidden"
        className="fixed left-1/2 top-[3.6rem] z-0 h-[15dvh] w-[150px] -translate-x-1/2 landscape:bottom-4 landscape:left-auto landscape:right-5 landscape:top-auto landscape:h-[min(32dvh,250px)] landscape:w-[min(20vw,230px)] landscape:translate-x-0"
      />

      {/* HUD */}
      <header className="hx-hud z-20 shrink-0">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-6">
          <Link href="/quizzes" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line-strong)] bg-[var(--surface-2)] font-bold transition hover:border-[var(--bad)] hover:text-[var(--bad)]" aria-label="Salir del quiz" title="Salir">
            ✕
          </Link>

          {/* Segmented progress: one cell per question, clickable */}
          <nav aria-label="Preguntas" className="flex min-w-0 flex-1 items-center gap-1">
            {questions.map((qq, i) => {
              const a = answers[i];
              const state = a === -1 ? "pending" : a === qq.correctIndex ? "hit" : "miss";
              const cur = i === current;
              return (
                <motion.button
                  key={i}
                  onClick={() => goTo(i)}
                  whileHover={reduce ? undefined : { scaleY: 1.5 }}
                  aria-label={`Pregunta ${i + 1}${state === "hit" ? ", correcta" : state === "miss" ? ", incorrecta" : ""}`}
                  aria-current={cur ? "step" : undefined}
                  className={`h-3 min-w-1.5 flex-1 rounded-full transition-all ${
                    state === "hit"
                      ? "bg-[var(--ok)] shadow-[0_0_10px_var(--ok)]"
                      : state === "miss"
                        ? "bg-[var(--bad)] shadow-[0_0_10px_var(--bad)]"
                        : cur
                          ? "bg-[var(--neon)] shadow-[0_0_12px_var(--neon)]"
                          : "bg-[var(--track)]"
                  } ${cur ? "scale-y-150 ring-2 ring-[var(--fg)]/60" : ""}`}
                />
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {playerName && (
              <span className="hidden items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] py-1 pl-1 pr-3 sm:flex" title={playerName}>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[var(--b1)] to-[var(--b2)] text-sm font-bold text-[#2a2012]">{playerName.charAt(0).toUpperCase()}</span>
                <span className="max-w-[7rem] truncate text-sm font-bold">{playerName.split(" ")[0]}</span>
              </span>
            )}
            <Stat label="XP" bump={feedback?.kind === "hit" ? feedback.key : 0}>
              <AnimatedNumber value={xp} />
              {feedback?.kind === "hit" && (
                <span key={feedback.key} className="anim-float-up absolute -top-3 right-0 text-xs font-bold text-[var(--ok)]">
                  +{Math.round(feedback.gained / 10)}
                </span>
              )}
            </Stat>
            <div
              className={`flex items-center gap-1.5 rounded-xl border px-2 py-1 transition ${comboHot ? "border-[var(--hot)] bg-[var(--hot)]/15 shadow-[0_0_22px_color-mix(in_oklab,var(--hot)_45%,transparent)]" : "border-[var(--line)] bg-[var(--surface-2)]"}`}
              aria-label={`Combo ${streak}`}
            >
              <StreakFlame size={streak >= 5 ? 34 : 26} active={streak > 0} days={streak >= 8 ? 30 : 1} />
              <span key={streak} className={`font-display text-lg font-bold tabular-nums ${streak ? "pop-in" : "hx-mute"}`}>
                x{streak}
              </span>
            </div>
            <span className="hidden font-display text-sm tabular-nums text-[var(--mute)] sm:inline" aria-label="Tiempo">
              ⏱ {formatTime(seconds)}
            </span>
            <ThemeToggle className="!h-8 !w-8" />
          </div>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-3 pt-[18dvh] sm:px-6 landscape:pt-3">
        <MascotPicker className="right-3 top-16" />

        <div className={`hx-epic ${streak >= 8 ? "hx-epic-hot hx-epic-blaze" : streak >= 3 ? "hx-epic-hot" : ""} relative mx-auto flex max-h-full min-h-0 w-full max-w-[560px] flex-col p-3 sm:p-5`}>
          <FireBorder streak={streak} />
          <div className="flex shrink-0 items-center justify-between gap-2">
            <p className="hx-kicker">
              Pregunta {current + 1} <span className="hx-mute">/ {questions.length}</span>
            </p>
            <p className="hx-mute max-w-[55%] truncate text-xs sm:text-sm">
              {topic} · {title}
            </p>
          </div>

          {/* Only this area scrolls, and only if a long question does not fit. */}
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.section
                key={current}
                custom={direction}
                initial={reduce ? false : { opacity: 0, x: 70 * direction, filter: "blur(6px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={reduce ? undefined : { opacity: 0, x: -70 * direction, filter: "blur(6px)" }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className={feedback?.kind === "miss" ? "anim-shake" : ""}
              >
                <h1 className="font-display text-lg font-bold leading-snug sm:text-[1.35rem]">{q.question}</h1>

                <ul className="mt-4 space-y-2">
                  {q.options.map((opt, i) => {
                    const isCorrect = i === q.correctIndex;
                    const isChosen = i === chosen;
                    const cls = answered ? (isCorrect ? "q-opt-ok" : isChosen ? "q-opt-bad" : "q-opt-dim") : "";
                    return (
                      <motion.li
                        key={i}
                        initial={reduce ? false : { opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.06 * i + 0.1, type: "spring", stiffness: 320, damping: 24 }}
                      >
                        <button
                          ref={(el) => {
                            optionRefs.current[i] = el;
                          }}
                          onClick={() => choose(i)}
                          disabled={answered}
                          title={`Tecla ${i + 1} o ${LETTERS[i]}`}
                          className={`q-opt disabled:cursor-default ${cls} ${answered && isCorrect && isChosen ? "anim-pop" : ""}`}
                        >
                          <span className={`q-key ${answered && isCorrect ? "!border-[var(--ok)] !bg-[var(--ok)] !text-[var(--on-accent)] !shadow-none" : answered && isChosen ? "!border-[var(--bad)] !bg-[var(--bad)] !text-white !shadow-none" : ""}`}>
                            {LETTERS[i]}
                          </span>
                          <span className={`flex-1 text-[0.9rem] leading-snug sm:text-[0.95rem] ${answered && (isCorrect || isChosen) ? "font-bold" : ""}`}>{opt}</span>
                          {answered && isCorrect && <span className="shrink-0 text-sm font-bold text-[var(--ok)]">✓</span>}
                          {answered && isChosen && !isCorrect && <span className="shrink-0 text-sm font-bold text-[var(--bad)]">✗</span>}
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>

                <div aria-live="polite">
                  {answered && (
                    <motion.div initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-2">
                      {feedback && (
                        <p
                          className={`font-display text-lg font-bold ${feedback.kind === "hit" ? "text-[var(--ok)]" : "text-[var(--bad)]"}`}
                          style={{ textShadow: `0 0 20px color-mix(in oklab, ${feedback.kind === "hit" ? "var(--ok)" : "var(--bad)"} 50%, transparent)` }}
                        >
                          {feedback.message}
                          {feedback.kind === "hit" && <span className="ml-2 rounded-full bg-[var(--ok)]/15 px-2 py-0.5 text-sm">+{Math.round(feedback.gained / 10)} XP</span>}
                        </p>
                      )}
                      <div className="rounded-xl border-l-4 border-[var(--neon)] bg-[var(--neon)]/10 px-3.5 py-2.5 text-sm sm:text-base">
                        <span className="font-bold">Explicación:</span> {q.explanation}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.section>
            </AnimatePresence>
          </div>

          {error && (
            <p role="alert" className="mt-2 shrink-0 rounded-lg border-l-4 border-[var(--bad)] bg-[var(--bad)]/10 px-3 py-2 text-sm font-bold text-[var(--bad)]">
              {error}
            </p>
          )}

          {/* Controls */}
          <div className="mt-3 flex shrink-0 items-center gap-2">
            <Btn onClick={() => goTo(current - 1)} disabled={current === 0} aria-label="Anterior">
              ←<span className="hidden sm:inline">Anterior</span>
            </Btn>
            <Btn onClick={() => setDialog("restart")} disabled={answeredCount === 0 || submitting} title="Empezar de nuevo">
              ↺<span className="hidden md:inline">Reiniciar</span>
            </Btn>
            <Btn variant="danger" onClick={() => setDialog("finish")} disabled={submitting} title="Finalizar quiz">
              ⏹<span className="hidden md:inline">Finalizar</span>
            </Btn>
            <div className="flex-1" />
            {isLast ? (
              <Btn variant="gold" onClick={() => (unanswered > 0 ? setDialog("finish") : finish())} disabled={submitting} className="!px-5">
                {submitting && <Spinner />}
                Ver resultados ▶
              </Btn>
            ) : (
              <Btn variant={answered ? "gold" : undefined} onClick={() => goTo(current + 1)} className={`!px-5 ${answered ? "pop-in" : ""}`} key={String(answered)}>
                Siguiente →
              </Btn>
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

function Btn({ variant, className = "", ...props }: ComponentProps<"button"> & { variant?: "gold" | "cyan" | "danger" }) {
  const v = variant === "gold" ? "hx-btn-gold" : variant === "cyan" ? "hx-btn-cyan" : variant === "danger" ? "hx-btn-danger" : "";
  return <button className={`hx-btn !px-3 !py-2 text-sm ${v} ${className}`} {...props} />;
}

function Stat({ label, children, bump = 0 }: { label: string; children: React.ReactNode; bump?: number }) {
  return (
    <div className="relative flex shrink-0 flex-col items-center rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-0.5 leading-tight" aria-label={label}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--mute)]">{label}</span>
      <span key={bump} className={`font-display text-base font-bold tabular-nums ${bump ? "anim-pop" : ""}`}>
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
    <div className="hx anim-fade-in fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" className="hx-epic pop-in w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 id="dialog-title" className="font-display text-2xl font-bold">
          {title}
        </h2>
        <p className="hx-mute mt-2">{body}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Btn onClick={onCancel} disabled={loading} autoFocus>
            Cancelar
          </Btn>
          <Btn variant="gold" onClick={onConfirm} disabled={loading}>
            {loading && <Spinner />}
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}
