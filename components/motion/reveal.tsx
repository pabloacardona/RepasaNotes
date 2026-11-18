"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

// Fades and lifts children into view on scroll. Plain CSS transitions (see .rv in globals.css) driven by one
// IntersectionObserver: no animation library, no per-frame JS, and the same look on phones.
let io: IntersectionObserver | null = null;
function observe(el: Element) {
  io ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("in");
        io?.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -40px 0px" },
  );
  io.observe(el);
  return () => io?.unobserve(el);
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => (ref.current ? observe(ref.current) : undefined), []);
  return ref;
}

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`rv ${className}`} style={delay ? ({ transitionDelay: `${delay}s` } as CSSProperties) : undefined}>
      {children}
    </div>
  );
}

// Staggered list: each child fades in a little after the previous one (the first 8 are staggered, the rest follow together).
export function Stagger({ children, className = "" }: { children: ReactNode; className?: string; gap?: number }) {
  const ref = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`rv-group ${className}`}>
      {children}
    </div>
  );
}

export function StaggerItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rv-item ${className}`}>{children}</div>;
}
