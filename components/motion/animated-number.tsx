"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

const format = (n: number) => n.toLocaleString("es-CO");

// Number that animates from its previous value to the new one.
export function AnimatedNumber({ value, from }: { value: number; from?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(from ?? value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = prev.current;
    prev.current = value;
    if (reduce || from === value) {
      el.textContent = format(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (n) => {
        el.textContent = format(Math.round(n));
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return <span ref={ref}>{format(from ?? value)}</span>;
}
