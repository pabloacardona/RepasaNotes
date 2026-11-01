import { useId, type CSSProperties } from "react";

// Vector flame for the day streak: two layers that sway out of step. It turns blue from 30 days on, and grey when off.
export function StreakFlame({ size = 48, active = true, days = 1 }: { size?: number; active?: boolean; days?: number }) {
  const uid = useId().replace(/:/g, "");
  const blue = days >= 30;
  const pal = active
    ? blue
      ? { a: "#1d4ed8", b: "#38bdf8", c: "#e0f7ff", fl: "#3b9dff" }
      : { a: "#ff3d00", b: "#ffb300", c: "#fff6c0", fl: "#ff7a00" }
    : { a: "#4a4f66", b: "#6a708a", c: "#9aa0b8", fl: "#555" };
  const style = { width: size * 0.78, height: size, ["--fl" as string]: pal.fl } as CSSProperties;
  return (
    <span className={`flame ${active ? "" : "flame-off"}`} style={style} aria-hidden>
      <svg viewBox="0 0 78 100" width={size * 0.78} height={size}>
        <defs>
          <linearGradient id={`o${uid}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={pal.a} />
            <stop offset="1" stopColor={pal.b} />
          </linearGradient>
          <linearGradient id={`i${uid}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={pal.b} />
            <stop offset="1" stopColor={pal.c} />
          </linearGradient>
        </defs>
        <g className="f1">
          <path d="M39 2 C44 22 66 34 66 62 C66 84 54 98 39 98 C24 98 12 84 12 62 C12 46 22 38 26 26 C30 34 32 38 34 40 C36 28 36 14 39 2 Z" fill={`url(#o${uid})`} />
        </g>
        <g className="f2">
          <path d="M40 38 C42 52 56 58 56 74 C56 88 49 96 40 96 C31 96 24 88 24 74 C24 64 30 60 33 52 C36 58 38 58 38 58 C39 50 40 44 40 38 Z" fill={`url(#i${uid})`} />
          <ellipse cx="40" cy="82" rx="8" ry="11" fill={pal.c} opacity="0.85" />
        </g>
      </svg>
    </span>
  );
}
