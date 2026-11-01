"use client";

import { useId, useMemo } from "react";

// A row of flames that dance in place (SVG tongues with CSS flicker). Used for the landing: along the bottom of the hero
// as an ambient fire, and on top of the big title so its letters burn. Anchor it with `className` (absolute, bottom-0...).
const TONGUE = "M30 0 C33 18 52 30 54 60 C56 84 44 100 30 100 C16 100 4 84 6 60 C8 42 20 38 22 22 C25 28 28 16 30 0 Z";
const CORE = "M30 38 C32 50 44 56 44 72 C44 88 38 98 30 98 C22 98 16 88 16 72 C16 60 24 56 26 46 C28 50 29 44 30 38 Z";

function seeded(n: number) {
  let s = n * 9301 + 49297;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

export function FlameRow({
  count = 24,
  height = 90,
  seed = 3,
  className = "",
  colors = ["#e11d2e", "#ff6a1a", "#ffd24d"],
  glow = "#ff4d1a",
}: {
  count?: number;
  height?: number;
  seed?: number;
  className?: string;
  colors?: [string, string, string] | string[];
  glow?: string;
}) {
  const id = useId().replace(/:/g, "");
  const tongues = useMemo(() => {
    const r = seeded(seed);
    return Array.from({ length: count }, (_, i) => ({
      left: (i / Math.max(1, count - 1)) * 100 + (r() - 0.5) * 2,
      scale: 0.5 + r() * 0.95,
      delay: r() * 1.4,
      d: 0.55 + r() * 0.6,
    }));
  }, [count, seed]);

  return (
    <div aria-hidden className={`pointer-events-none ${className}`} style={{ height }}>
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id={`fr${id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={colors[0]} />
            <stop offset="0.55" stopColor={colors[1]} />
            <stop offset="1" stopColor={colors[2]} stopOpacity="0.92" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative h-full w-full" style={{ filter: `drop-shadow(0 0 10px ${glow})` }}>
        {tongues.map((t, i) => (
          <svg
            key={i}
            viewBox="0 0 60 100"
            preserveAspectRatio="none"
            className="fire-tongue"
            style={{ left: `${t.left}%`, bottom: 0, width: height * t.scale * 0.55, height: height * t.scale, marginLeft: -(height * t.scale * 0.275), ["--d" as string]: `${t.d}s`, ["--delay" as string]: `${t.delay}s` }}
          >
            <path d={TONGUE} fill={`url(#fr${id})`} />
            <path d={CORE} fill={colors[2]} opacity="0.7" />
          </svg>
        ))}
      </div>
    </div>
  );
}
