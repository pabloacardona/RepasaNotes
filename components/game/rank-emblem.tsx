import { TIERS } from "@/lib/ranks";

// Pixel-art rank badge: a shield with a gem, drawn cell by cell on a 20x20 grid. Wings from Bronce, a crown from Maestro.
const W = 20;
const H = 20;

function mix(hex: string, to: string, t: number) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

type Cell = { x: number; y: number; c: string };

function build(tierIndex: number, color: string, glow: string, locked: boolean): Cell[] {
  const base = locked ? "#5a6078" : color;
  const light = locked ? "#8a90a8" : glow;
  const dark = mix(base, "#000000", 0.38);
  const ink = "#0b0c16";
  const cells = new Map<string, string>();
  const put = (x: number, y: number, c: string) => {
    if (x >= 0 && x < W && y >= 0 && y < H) cells.set(`${x},${y}`, c);
  };

  // Shield: rows 3..15, 12 wide at the top, narrowing to a point.
  const half = (y: number) => (y <= 9 ? 6 : Math.max(0, 6 - (y - 9)));
  const inside = (x: number, y: number) => y >= 3 && y <= 15 && Math.abs(x - 9.5) <= half(y) - 0.5 + (y <= 9 ? 0.5 : 0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y)) put(x, y, x + y < 20 ? mix(base, "#ffffff", 0.18) : dark);
  // Outline.
  const edge: [number, number][] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (inside(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inside(x + dx, y + dy))) edge.push([x, y]);
  edge.forEach(([x, y]) => put(x, y, ink));

  // Gem: a diamond with a lit upper half.
  for (let y = 5; y <= 13; y++) {
    const r = 4 - Math.abs(y - 9);
    if (r < 0) continue;
    for (let x = 10 - r - 1; x <= 9 + r; x++) put(x, y, y <= 9 ? light : base);
  }
  put(8, 7, "#ffffff");
  put(9, 6, "#ffffff");

  // Wings.
  if (tierIndex >= 1) {
    const wing = Math.min(1 + Math.floor(tierIndex / 3), 3);
    for (let i = 0; i < wing; i++) {
      for (let k = 0; k < 3; k++) {
        put(2 - k + 0, 6 + i * 2 + (k === 2 ? 1 : 0), i === 0 ? light : base);
        put(17 + k, 6 + i * 2 + (k === 2 ? 1 : 0), i === 0 ? light : base);
      }
    }
  }
  // Crown.
  if (tierIndex >= 7) {
    [[6, 1], [9, 0], [10, 0], [13, 1], [7, 2], [12, 2], [8, 1], [11, 1]].forEach(([x, y]) => put(x, y, light));
  }
  return [...cells.entries()].map(([k, c]) => {
    const [x, y] = k.split(",").map(Number);
    return { x, y, c };
  });
}

export function RankEmblem({
  tierIndex,
  division = null,
  size = 96,
  className = "",
  locked = false,
}: {
  tierIndex: number;
  division?: number | null;
  size?: number;
  className?: string;
  locked?: boolean;
}) {
  const tier = TIERS[Math.min(tierIndex, TIERS.length - 1)];
  const cells = build(tierIndex, tier.color, tier.glow, locked);
  const pips = division ? 5 - division : 0; // IV = 1 pip ... I = 4 pips

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${W} ${H + 2}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Insignia ${tier.name}`}
      className={`${locked ? "" : "hx-bob"} ${className}`}
    >
      {cells.map((p) => (
        <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="1.02" height="1.02" fill={p.c} />
      ))}
      {division
        ? [0, 1, 2, 3].map((i) => <rect key={i} x={5.5 + i * 2.4} y={H + 0.5} width="1.6" height="1.2" fill={i < pips ? tier.glow : "#2a2f55"} stroke="#0b0c16" strokeWidth="0.25" />)
        : <rect x="8.8" y={H + 0.3} width="2.4" height="1.6" fill={tier.glow} stroke="#0b0c16" strokeWidth="0.25" />}
    </svg>
  );
}
