import type { CSSProperties } from "react";

// Pixel-art flame for the day streak. Two layers flicker out of step. It turns blue from 30 days on.
const ROWS = [
  "....o.......",
  "...oo...o...",
  "...ooo..oo..",
  "..oooo.ooo..",
  "..ooooooooo.",
  ".ooooyyoooo.",
  ".oooyyyyooo.",
  "oooyyyyyyoo.",
  "oooyywwyyoo.",
  "ooyywwwwyyo.",
  "ooyywwwwyyo.",
  "ooyyywwyyyo.",
  ".oyyyyyyyyo.",
  ".ooyyyyyyoo.",
  "..oooyyyooo.",
  "...ooooooo..",
];

export function StreakFlame({ size = 48, active = true, days = 1 }: { size?: number; active?: boolean; days?: number }) {
  const blue = days >= 30;
  const pal = active
    ? blue
      ? { o: "#1d6fe0", y: "#5ec8ff", w: "#e6f8ff" }
      : { o: "#ff5a00", y: "#ffc400", w: "#fff6c8" }
    : { o: "#4a4f66", y: "#6a708a", w: "#8a90a8" };
  const rects = (keys: string[]) =>
    ROWS.flatMap((row, y) =>
      [...row.padEnd(12, ".")].map((ch, x) => (keys.includes(ch) ? <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={pal[ch as "o" | "y" | "w"]} /> : null)),
    );
  const style = { width: size * 0.75, height: size, ["--fl" as string]: pal.o } as CSSProperties;
  return (
    <span className={`flame ${active ? "" : "flame-off"}`} style={style} aria-hidden>
      <svg viewBox="0 0 12 16" width={size * 0.75} height={size} shapeRendering="crispEdges">
        <g className="f1">{rects(["o"])}</g>
        <g className="f2">{rects(["y", "w"])}</g>
      </svg>
    </span>
  );
}
