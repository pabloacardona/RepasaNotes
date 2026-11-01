"use client";

import { useEffect, useMemo, useRef } from "react";

// Night sky of square stars in two layers that shift with the pointer (parallax), a shooting star now and then,
// and a one-frame colour flash after each answer (green for a hit, red for a miss) drawn with steps() like a palette swap.
function stars(n: number, seed: number, size: number, colors: string[]) {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  return Array.from({ length: n }, (_, i) => `${Math.round(rnd() * 100)}vw ${Math.round(rnd() * 100)}vh 0 ${size > 2 && i % 4 === 0 ? 1 : 0}px ${colors[i % colors.length]}`).join(",");
}

export function RetroBackdrop({ pulse = 0, lastHit = null }: { pulse?: number; lastHit?: boolean | null; streak?: number; calm?: boolean }) {
  const far = useRef<HTMLDivElement>(null);
  const near = useRef<HTMLDivElement>(null);
  const farShadow = useMemo(() => stars(46, 7, 2, ["var(--fg)", "var(--neon)", "var(--fg)"]), []);
  const nearShadow = useMemo(() => stars(18, 21, 3, ["var(--accent)", "var(--fg)", "#ff77a8", "var(--neon)"]), []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = e.clientX / window.innerWidth - 0.5;
        const y = e.clientY / window.innerHeight - 0.5;
        if (far.current) far.current.style.transform = `translate(${-x * 14}px, ${-y * 14}px)`;
        if (near.current) near.current.style.transform = `translate(${-x * 34}px, ${-y * 34}px)`;
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="hx-bg" />
      <div ref={far} className="absolute inset-0 opacity-50 transition-transform duration-300 ease-out [:root:not([data-theme=dark])_&]:opacity-20">
        <div className="h-[2px] w-[2px]" style={{ boxShadow: farShadow }} />
      </div>
      <div ref={near} className="absolute inset-0 opacity-80 transition-transform duration-300 ease-out [:root:not([data-theme=dark])_&]:opacity-30">
        <div className="hx-twinkle h-[3px] w-[3px]" style={{ boxShadow: nearShadow }} />
      </div>
      <span className="hx-shooting" />
      {pulse > 0 && lastHit !== null && <div key={pulse} className={lastHit ? "hx-flash-hit" : "hx-flash-miss"} />}
    </div>
  );
}
