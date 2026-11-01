"use client";

import { motion, useReducedMotion } from "motion/react";

// Circular XP progress with the level in the middle.
export function LevelRing({
  level,
  pct,
  size = 96,
  from,
}: {
  level: number;
  pct: number;
  size?: number;
  from?: number; // starting percentage, to animate a gain
}) {
  const reduce = useReducedMotion();
  const stroke = Math.max(6, size * 0.1);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const id = `lr-${size}`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Nivel ${level}, ${pct}% hacia el siguiente`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f6d44a" />
            <stop offset="100%" stopColor="#ff8a3d" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.14} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c * (1 - (reduce ? pct : (from ?? 0)) / 100) }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ type: "spring", stiffness: 50, damping: 16, delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div>
          <p className="text-[0.6rem] font-bold uppercase tracking-widest opacity-70">Nivel</p>
          <p className="font-display font-extrabold" style={{ fontSize: size * 0.34 }}>
            {level}
          </p>
        </div>
      </div>
    </div>
  );
}
