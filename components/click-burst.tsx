"use client";

import { useEffect } from "react";

// A small burst of square pixels wherever a button or link is pressed. Skipped for reduced motion.
const COLORS = ["#ffec27", "#ff77a8", "#29adff", "#00e436", "#ffa300", "#fff1e8"];

export function ClickBurst() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onDown = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target.closest("button, a, [role=button], .hx-lift") : null;
      if (!el || (el as HTMLButtonElement).disabled) return;
      for (let i = 0; i < 9; i++) {
        const p = document.createElement("span");
        const a = (i / 9) * Math.PI * 2 + Math.random() * 0.6;
        const d = 26 + Math.random() * 34;
        p.className = "px-burst";
        p.style.left = `${e.clientX - 4}px`;
        p.style.top = `${e.clientY - 4}px`;
        p.style.background = COLORS[i % COLORS.length];
        p.style.setProperty("--dx", `${Math.cos(a) * d}px`);
        p.style.setProperty("--dy", `${Math.sin(a) * d}px`);
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 600);
      }
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
