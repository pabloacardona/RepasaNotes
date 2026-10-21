"use client";

import { motion, useReducedMotion } from "motion/react";

// Progress bar that grows when it scrolls into view.
export function AnimatedBar({ percent, className, delay = 0 }: { percent: number; className: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={`block h-full rounded-full ${className}`}
      initial={reduce ? false : { width: 0 }}
      whileInView={{ width: `${Math.max(percent, 3)}%` }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 60, damping: 16, delay }}
      style={reduce ? { width: `${Math.max(percent, 3)}%` } : undefined}
    />
  );
}
