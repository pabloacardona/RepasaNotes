"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo } from "react";

// Flames licking the top edge of a card, plus rising embers. It lights up with the combo (3+), grows at 5 and 8,
// and goes out smoothly when the combo breaks. Level 3 burns blue-white.
const TONGUE = "M30 0 C33 18 52 30 54 60 C56 84 44 100 30 100 C16 100 4 84 6 60 C8 42 20 38 22 22 C25 28 28 16 30 0 Z";
const CORE = "M30 38 C32 50 44 56 44 72 C44 88 38 98 30 98 C22 98 16 88 16 72 C16 60 24 56 26 46 C28 50 29 44 30 38 Z";

function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

export function FireBorder({ streak }: { streak: number }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const level = streak >= 8 ? 3 : streak >= 5 ? 2 : streak >= 3 ? 1 : 0;
  const count = [0, 16, 22, 30][level];
  const base = [0, 38, 54, 72][level];
  const tongues = useMemo(() => {
    const r = seeded(11);
    return Array.from({ length: 30 }, (_, i) => ({ left: 1 + (i / 29) * 98 + (r() - 0.5) * 2, scale: 0.55 + r() * 0.9, delay: r() * 1.2, d: 0.5 + r() * 0.5 }));
  }, []);
  const embers = useMemo(() => {
    const r = seeded(5);
    return Array.from({ length: 16 }, () => ({ left: 4 + r() * 92, delay: r() * 2.4, d: 1.4 + r() * 1.4, ex: Math.round((r() - 0.5) * 50) }));
  }, []);
  const inner = level === 3 ? ["#2c6bff", "#38bdf8", "#eaffff"] : ["#ff3d00", "#ffb300", "#fff6c0"];

  return (
    <AnimatePresence>
      {level > 0 && (
        <motion.div
          key="fire"
          aria-hidden
          className="pointer-events-none absolute inset-x-1 -top-0.5 z-0 h-0"
          initial={reduce ? false : { opacity: 0, scaleY: 0.3 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={reduce ? undefined : { opacity: 0, scaleY: 0.2, filter: "blur(6px)" }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          style={{ transformOrigin: "50% 100%" }}
        >
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id={`fo${id}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor={inner[0]} />
                <stop offset="0.6" stopColor={inner[1]} />
                <stop offset="1" stopColor={inner[2]} stopOpacity="0.9" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-x-0 bottom-0 h-0" style={{ filter: `drop-shadow(0 0 ${6 + level * 4}px ${level === 3 ? "#38bdf8" : "#ff7a00"})` }}>
            <div aria-hidden className="absolute inset-x-1 bottom-[-3px] h-3 rounded-full blur-md" style={{ background: `linear-gradient(90deg, transparent, ${inner[0]}, ${inner[1]}, ${inner[0]}, transparent)`, opacity: 0.9 }} />
            {tongues.slice(0, count).map((t, i) => (
              <svg
                key={i}
                viewBox="0 0 60 100"
                preserveAspectRatio="none"
                className="fire-tongue"
                style={{ left: `${t.left}%`, bottom: -4, width: base * t.scale * 0.52, height: base * t.scale, marginLeft: -(base * t.scale * 0.26), ["--d" as string]: `${t.d}s`, ["--delay" as string]: `${t.delay}s` }}
              >
                <path d={TONGUE} fill={`url(#fo${id})`} />
                <path d={CORE} fill={inner[2]} opacity="0.75" />
              </svg>
            ))}
          </div>
          {level >= 2 &&
            embers.slice(0, level === 3 ? 16 : 9).map((e, i) => (
              <span key={i} className="ember" style={{ left: `${e.left}%`, bottom: 4, ["--d" as string]: `${e.d}s`, ["--delay" as string]: `${e.delay}s`, ["--ex" as string]: `${e.ex}px`, background: level === 3 ? "#bfeaff" : undefined, boxShadow: level === 3 ? "0 0 8px 2px #38bdf8" : undefined }} />
            ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
