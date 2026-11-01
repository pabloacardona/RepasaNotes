import type { CSSProperties } from "react";
import { TIERS } from "@/lib/ranks";

// Pixel-art rank crest, drawn cell by cell on a 24x24 grid, plus light effects around it: a pulsing aura,
// turning rays, twinkling sparkles and a glow that grows with the tier. Every tier has its own silhouette
// (shield, hex or diamond body; feather, leaf or flame wings; crown spikes; halo), so climbing looks like progress.
const W = 24;
const H = 24;

function mix(hex: string, to: string, t: number) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

type Spec = {
  body: "shield" | "hex" | "diamond";
  wings: number;
  wing: "feather" | "leaf" | "flame";
  crown: 0 | 1 | 2;
  halo: boolean;
  gem: "round" | "diamond" | "star";
  aura: number; // 0..5
  sparks: number;
  rays: boolean;
};

const SPECS: Spec[] = [
  { body: "shield", wings: 0, wing: "feather", crown: 0, halo: false, gem: "round", aura: 0, sparks: 0, rays: false },
  { body: "shield", wings: 1, wing: "feather", crown: 0, halo: false, gem: "round", aura: 1, sparks: 1, rays: false },
  { body: "shield", wings: 2, wing: "feather", crown: 0, halo: false, gem: "diamond", aura: 1, sparks: 2, rays: false },
  { body: "shield", wings: 3, wing: "feather", crown: 1, halo: false, gem: "diamond", aura: 2, sparks: 3, rays: false },
  { body: "hex", wings: 2, wing: "leaf", crown: 0, halo: true, gem: "diamond", aura: 2, sparks: 4, rays: false },
  { body: "hex", wings: 3, wing: "leaf", crown: 1, halo: true, gem: "star", aura: 3, sparks: 5, rays: false },
  { body: "diamond", wings: 3, wing: "feather", crown: 0, halo: true, gem: "diamond", aura: 3, sparks: 6, rays: true },
  { body: "diamond", wings: 4, wing: "feather", crown: 2, halo: true, gem: "star", aura: 4, sparks: 7, rays: true },
  { body: "shield", wings: 4, wing: "flame", crown: 2, halo: true, gem: "star", aura: 4, sparks: 8, rays: true },
  { body: "diamond", wings: 5, wing: "feather", crown: 2, halo: true, gem: "star", aura: 5, sparks: 10, rays: true },
];

type Cell = { x: number; y: number; c: string; o?: number };

function build(tierIndex: number, color: string, glow: string, locked: boolean): Cell[] {
  const sp = SPECS[Math.min(tierIndex, SPECS.length - 1)];
  const base = locked ? "#555b73" : color;
  const light = locked ? "#8a90a8" : glow;
  const mid = mix(base, "#ffffff", 0.22);
  const dark = mix(base, "#000000", 0.4);
  const ink = "#0b0c16";
  const cells = new Map<string, Cell>();
  const put = (x: number, y: number, c: string, o?: number) => {
    if (x >= 0 && x < W && y >= 0 && y < H) cells.set(`${x},${y}`, { x, y, c, o });
  };

  // Body.
  const cx = 11.5;
  const half = (y: number) => {
    if (y < 4 || y > 20) return -1;
    if (sp.body === "shield") return y <= 12 ? 7.5 : Math.max(0, 7.5 - (y - 12) * 0.95);
    if (sp.body === "hex") return 7.5 - Math.abs(y - 12) * 0.5;
    return Math.max(0, 8.5 - Math.abs(y - 12) * 1.0); // diamond
  };
  const inside = (x: number, y: number) => Math.abs(x - cx) <= half(y) - 0.5 && half(y) > 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y)) put(x, y, x + y < 23 ? mid : dark);
  // Bevel: bright top edge.
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y) && !inside(x, y - 1)) put(x, y, light);
  // Outline.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (inside(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inside(x + dx, y + dy))) put(x, y, ink);
  // Inner rim.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (inside(x, y) && cells.get(`${x},${y}`)?.c !== ink && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => cells.get(`${x + dx},${y + dy}`)?.c === ink)) put(x, y, base);

  // Gem.
  const gy = 11.5;
  if (sp.gem === "round") {
    for (let y = 9; y <= 14; y++) for (let x = 9; x <= 14; x++) if ((x - 11.5) ** 2 + (y - 11.5) ** 2 <= 7) put(x, y, y <= 11 ? light : base);
  } else if (sp.gem === "diamond") {
    for (let y = 6; y <= 17; y++) {
      const r = 4.5 - Math.abs(y - gy) * 0.8;
      for (let x = 0; x < W; x++) if (Math.abs(x - 11.5) <= r - 0.3 && r > 0) put(x, y, y <= 11 ? light : base);
    }
  } else {
    // Star.
    const pts = [[11, 6], [12, 6], [11, 7], [12, 7], [10, 8], [11, 8], [12, 8], [13, 8], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [8, 10], [9, 10], [10, 10], [11, 10], [12, 10], [13, 10], [14, 10], [15, 10], [9, 11], [10, 11], [11, 11], [12, 11], [13, 11], [14, 11], [9, 12], [10, 12], [11, 12], [12, 12], [13, 12], [14, 12], [9, 13], [10, 13], [11, 13], [12, 13], [13, 13], [14, 13], [8, 14], [9, 14], [10, 14], [13, 14], [14, 14], [15, 14], [8, 15], [9, 15], [14, 15], [15, 15]];
    pts.forEach(([x, y]) => put(x, y, y <= 11 ? "#fff6c8" : light));
  }
  put(10, 9, "#ffffff");
  put(11, 8, "#ffffff");

  // Wings.
  for (let k = 0; k < sp.wings; k++) {
    const y0 = 8 + k * 2;
    const len = 5 + (sp.wings - k > 2 ? 1 : 0) + Math.min(k, 1);
    for (let j = 0; j < len; j++) {
      const fx = sp.wing === "flame" ? (j + k) % 2 === 0 : false;
      const c = sp.wing === "flame" ? (fx ? "#ffa300" : "#ffec27") : k === 0 ? light : k % 2 ? mid : base;
      const yy = y0 - Math.floor(j / 2);
      put(3 - j + (k > 0 ? 0 : 1), yy, c);
      put(20 + j - (k > 0 ? 0 : 1), yy, c);
      if (sp.wing === "leaf" || j < 2) {
        put(3 - j + (k > 0 ? 0 : 1), yy + 1, mix(c, "#000000", 0.25));
        put(20 + j - (k > 0 ? 0 : 1), yy + 1, mix(c, "#000000", 0.25));
      }
    }
  }

  // Crown spikes.
  if (sp.crown >= 1) {
    const spikes = sp.crown === 2 ? [[6, 4], [9, 2], [11, 0], [12, 0], [14, 2], [17, 4]] : [[8, 3], [11, 1], [12, 1], [15, 3]];
    spikes.forEach(([x, y]) => {
      for (let yy = y; yy <= 4; yy++) put(x, yy, yy === y ? "#ffffff" : light);
    });
  }

  // Halo.
  if (sp.halo) {
    for (let a = 0; a < 40; a++) {
      const t = (a / 40) * Math.PI * 2;
      put(Math.round(11.5 + Math.cos(t) * 11), Math.round(12 + Math.sin(t) * 11), light, 0.55);
    }
  }
  return [...cells.values()];
}

// Light effects around the crest, in the tier colour.
const SPARKS = [
  [8, 12], [90, 16], [4, 62], [94, 66], [22, 2], [78, 6], [-4, 38], [100, 40], [30, 92], [70, 90],
];

export function RankEmblem({
  tierIndex,
  division = null,
  size = 96,
  className = "",
  locked = false,
  effects = true,
}: {
  tierIndex: number;
  division?: number | null;
  size?: number;
  className?: string;
  locked?: boolean;
  effects?: boolean;
}) {
  const i = Math.min(tierIndex, TIERS.length - 1);
  const tier = TIERS[i];
  const sp = SPECS[i];
  const cells = build(i, tier.color, tier.glow, locked);
  const pips = division ? 5 - division : 0; // IV = 1 pip ... I = 4 pips
  const showFx = effects && !locked && size >= 56;
  const glowPx = Math.round(size * (0.04 + sp.aura * 0.03));
  const style = { width: size, height: size, ["--c" as string]: tier.color, ["--g" as string]: tier.glow } as CSSProperties;

  return (
    <div className={`rank-emblem relative inline-block ${className}`} style={style} role="img" aria-label={`Insignia ${tier.name}${locked ? " (bloqueada)" : ""}`}>
      {showFx && sp.aura > 0 && <span aria-hidden className="rank-aura" style={{ opacity: 0.35 + sp.aura * 0.1 }} />}
      {showFx && sp.rays && <span aria-hidden className="rank-rays" />}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${W} ${H + 2}`}
        shapeRendering="crispEdges"
        className={`relative ${locked ? "grayscale" : "hx-bob"}`}
        style={{ filter: locked ? "drop-shadow(0 3px 0 rgba(0,0,0,.4))" : `drop-shadow(0 0 ${glowPx}px ${tier.color}) drop-shadow(0 4px 0 rgba(0,0,0,.5))`, overflow: "visible" }}
      >
        {cells.map((p) => (
          <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="1.02" height="1.02" fill={p.c} opacity={p.o} />
        ))}
        {division ? (
          [0, 1, 2, 3].map((k) => <rect key={k} x={6.2 + k * 3} y={H + 0.4} width="2" height="1.4" fill={k < pips ? tier.glow : "#2a2f55"} stroke="#0b0c16" strokeWidth="0.3" />)
        ) : (
          <rect x="10.4" y={H + 0.3} width="3" height="1.8" fill={tier.glow} stroke="#0b0c16" strokeWidth="0.3" />
        )}
      </svg>
      {showFx &&
        SPARKS.slice(0, sp.sparks).map(([x, y], k) => (
          <span key={k} aria-hidden className="rank-spark" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(k * 0.37) % 1.6}s` }} />
        ))}
      {locked && (
        <span aria-hidden className="absolute inset-0 grid place-items-center text-[1.4em]" style={{ fontSize: size * 0.3 }}>
          🔒
        </span>
      )}
    </div>
  );
}
