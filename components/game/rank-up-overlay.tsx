"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { celebrate } from "@/components/confetti";
import { TIERS } from "@/lib/ranks";
import { RankEmblem } from "./rank-emblem";

type R = { tierIndex: number; division: number | null; label: string };

// Full-screen promotion scene, rendered straight into <body> so no panel can clip it:
// 1) the old crest charges up, 2) a flash and shockwaves swap it for the new one, 3) the rank name rises in.
export function RankUpOverlay({ from, to, onClose }: { from: R; to: R; onClose: () => void }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState(reduce ? 2 : 0);
  const [size, setSize] = useState(240);
  const tier = TIERS[to.tierIndex];

  useEffect(() => {
    const fit = () => setSize(Math.round(Math.max(150, Math.min(300, window.innerWidth * 0.62, window.innerHeight * 0.34))));
    const t0 = setTimeout(() => {
      fit();
      setMounted(true);
    }, 0);
    window.addEventListener("resize", fit);
    return () => {
      clearTimeout(t0);
      window.removeEventListener("resize", fit);
    };
  }, []);
  useEffect(() => {
    if (reduce) return;
    const t1 = setTimeout(() => {
      setStage(1);
      celebrate();
    }, 1100);
    const t2 = setTimeout(() => setStage(2), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduce]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => (e.key === "Escape" || e.key === "Enter") && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;
  const shown = stage === 0 ? from : to;
  const name = to.label.split("");

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      role="dialog"
      aria-modal="true"
      aria-label={`Subiste a ${to.label}`}
      onClick={() => stage === 2 && onClose()}
      className="hx fixed inset-0 z-[500] flex flex-col items-center justify-center overflow-hidden px-4"
      style={{ background: `radial-gradient(ellipse at 50% 42%, color-mix(in oklab, ${tier.color} 24%, #05020a) 0%, #05020a 70%)`, ["--c" as string]: tier.color, ["--g" as string]: tier.glow }}
    >
      {/* Rays, only after the swap */}
      <motion.span
        aria-hidden
        className="rank-rays pointer-events-none"
        style={{ inset: "-70%" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: stage >= 1 ? 0.85 : 0 }}
        transition={{ duration: 0.9 }}
      />

      {/* Shockwaves */}
      <AnimatePresence>
        {stage === 1 &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="pointer-events-none absolute rounded-full border-2"
              style={{ width: size, height: size, borderColor: tier.glow }}
              initial={{ scale: 0.4, opacity: 0.9 }}
              animate={{ scale: 4.2, opacity: 0 }}
              transition={{ duration: 1.3, delay: i * 0.16, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
      </AnimatePresence>

      {/* Flash on the swap */}
      <AnimatePresence>
        {stage === 1 && <motion.span key="flash" aria-hidden className="pointer-events-none absolute inset-0 bg-white" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} />}
      </AnimatePresence>

      <div className="relative flex w-full max-w-xl flex-col items-center text-center">
        <motion.p
          className="font-display text-[clamp(0.8rem,2.6vw,1.1rem)] font-bold uppercase tracking-[0.35em] text-[var(--accent)]"
          initial={{ opacity: 0, y: -14, filter: "blur(8px)" }}
          animate={{ opacity: stage >= 2 ? 1 : stage === 0 ? 0.7 : 0, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6 }}
        >
          {stage === 0 ? "Subiendo…" : "¡Subiste de rango!"}
        </motion.p>

        <motion.div
          key={stage === 0 ? "old" : "new"}
          className="relative mt-5"
          initial={stage === 0 ? { scale: 0.7, opacity: 0 } : { scale: 0.35, rotate: -14, opacity: 0 }}
          animate={
            stage === 0
              ? { scale: 1, opacity: 1, x: reduce ? 0 : [0, -3, 3, -2, 2, 0] }
              : { scale: 1, rotate: 0, opacity: 1 }
          }
          transition={stage === 0 ? { duration: 0.9, x: { duration: 0.5, repeat: 1 } } : { type: "spring", stiffness: 170, damping: 11 }}
        >
          <RankEmblem tierIndex={shown.tierIndex} division={shown.division} size={size} />
        </motion.div>

        <div className="mt-5 min-h-[clamp(3.5rem,11vw,6rem)]" aria-live="polite">
          {stage >= 2 && (
            <motion.h2
              aria-label={to.label}
              className="font-display text-[clamp(2.4rem,9vw,5rem)] font-bold leading-none"
              style={{ color: tier.glow, textShadow: `0 0 34px ${tier.color}, 0 4px 0 rgba(0,0,0,.35)` }}
            >
              {name.map((ch, i) => (
                <motion.span
                  key={i}
                  aria-hidden
                  className="inline-block whitespace-pre"
                  initial={{ opacity: 0, y: 26, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: i * 0.045, type: "spring", stiffness: 220, damping: 18 }}
                >
                  {ch}
                </motion.span>
              ))}
            </motion.h2>
          )}
        </div>

        <motion.p
          className="mt-2 text-[clamp(0.95rem,3vw,1.2rem)] text-white/75"
          initial={{ opacity: 0 }}
          animate={{ opacity: stage >= 2 ? 1 : 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          Venías de <b className="text-white">{from.label}</b>. ¡Sigue así!
        </motion.p>

        <motion.button
          type="button"
          className="hx-btn hx-btn-gold mt-7 !px-9 !py-3 text-lg"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: stage >= 2 ? 1 : 0, y: stage >= 2 ? 0 : 14 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          style={{ pointerEvents: stage >= 2 ? "auto" : "none" }}
        >
          Continuar
        </motion.button>
      </div>
    </motion.div>,
    document.body,
  );
}
