"use client";

import { useEffect, useRef, useState } from "react";

// Progress bar that grows when it scrolls into view (CSS transition, no animation library).
export function AnimatedBar({ percent, className, delay = 0 }: { percent: number; className: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setShown(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <span
      ref={ref}
      className={`block h-full rounded-full motion-reduce:transition-none ${className}`}
      style={{ width: `${shown ? Math.max(percent, 3) : 0}%`, transition: "width 0.9s cubic-bezier(0.22, 1, 0.36, 1)", transitionDelay: `${delay}s` }}
    />
  );
}
