import { useId, type CSSProperties } from "react";
import { TIERS } from "@/lib/ranks";

// Forged rank crest, fantasy-RPG style. Every tier is built from layers, back to front: sun rays or crystal shards,
// crossed swords, layered wings, horns, a crown, a bevelled metal shield with rivets and an enamel field, a faceted gem
// in its bezel and a cloth banner that carries the division. Metal, enamel and gem have their own gradients so the crest
// reads as a solid object, and the light show (aura, rays, sparks, sheen) grows with the tier.
type Spec = {
  body: "heater" | "kite" | "crest" | "cut";
  wings: number;
  wing: "feather" | "blade" | "leaf" | "flame";
  crown: 0 | 1 | 2 | 3;
  horns: boolean;
  back: "none" | "shards" | "sun";
  swords: boolean;
  halo: boolean;
  gem: "round" | "diamond" | "emerald" | "star";
  gemColor: string;
  worn: boolean; // dents and a crack: iron that has seen battle
  aura: number; // 0..5
  sparks: number;
  rays: boolean;
};

const SPECS: Spec[] = [
  { body: "heater", wings: 0, wing: "blade", crown: 0, horns: false, back: "none", swords: false, halo: false, gem: "round", gemColor: "#7d86ad", worn: true, aura: 0, sparks: 0, rays: false },
  { body: "heater", wings: 1, wing: "blade", crown: 0, horns: false, back: "none", swords: false, halo: false, gem: "round", gemColor: "#e2603c", worn: false, aura: 1, sparks: 1, rays: false },
  { body: "heater", wings: 2, wing: "feather", crown: 0, horns: false, back: "none", swords: false, halo: false, gem: "diamond", gemColor: "#4f9bea", worn: false, aura: 1, sparks: 2, rays: false },
  { body: "heater", wings: 3, wing: "feather", crown: 1, horns: false, back: "none", swords: false, halo: false, gem: "diamond", gemColor: "#e0393f", worn: false, aura: 2, sparks: 3, rays: false },
  { body: "kite", wings: 3, wing: "blade", crown: 1, horns: false, back: "none", swords: false, halo: true, gem: "diamond", gemColor: "#35d6c4", worn: false, aura: 2, sparks: 4, rays: false },
  { body: "kite", wings: 3, wing: "leaf", crown: 2, horns: false, back: "none", swords: false, halo: true, gem: "emerald", gemColor: "#23c46f", worn: false, aura: 3, sparks: 5, rays: false },
  { body: "cut", wings: 2, wing: "feather", crown: 0, horns: false, back: "shards", swords: false, halo: true, gem: "diamond", gemColor: "#d6ecff", worn: false, aura: 3, sparks: 6, rays: true },
  { body: "cut", wings: 3, wing: "blade", crown: 2, horns: false, back: "none", swords: true, halo: true, gem: "star", gemColor: "#c86bff", worn: false, aura: 4, sparks: 7, rays: true },
  { body: "crest", wings: 4, wing: "flame", crown: 2, horns: true, back: "none", swords: false, halo: true, gem: "star", gemColor: "#ffb23e", worn: false, aura: 4, sparks: 8, rays: true },
  { body: "cut", wings: 5, wing: "feather", crown: 3, horns: false, back: "sun", swords: true, halo: true, gem: "star", gemColor: "#5fe6f2", worn: false, aura: 5, sparks: 10, rays: true },
];

const BODY = {
  heater: "M60 13 L74 19 L97 21 L97 62 Q97 97 60 121 Q23 97 23 62 L23 21 L46 19 Z",
  kite: "M60 9 L98 28 L98 76 L60 121 L22 76 L22 28 Z",
  crest: "M60 11 L72 21 L101 15 L97 62 Q96 98 60 122 Q24 98 23 62 L19 15 L48 21 Z",
  cut: "M60 5 L102 58 L60 122 L18 58 Z",
};
const INNER = {
  heater: "M60 24 L72 29 L88 30.5 L88 62 Q88 90 60 109 Q32 90 32 62 L32 30.5 L48 29 Z",
  kite: "M60 21 L88 35 L88 72.5 L60 106 L32 72.5 L32 35 Z",
  crest: "M60 24 L70 32 L90 27.5 L88 62 Q87 90 60 108 Q33 90 32 62 L30 27.5 L50 32 Z",
  cut: "M60 20 L90 58.5 L60 105 L30 58.5 Z",
};
const RIVETS = {
  heater: [[27.5, 25.5], [92.5, 25.5], [27.5, 58], [92.5, 58], [40, 94], [80, 94], [60, 18.5], [60, 115]],
  kite: [[27, 31.5], [93, 31.5], [27, 74], [93, 74], [60, 15], [60, 113.5], [43.5, 22.5], [76.5, 22.5]],
  crest: [[25.5, 21.5], [94.5, 21.5], [27.5, 60], [92.5, 60], [40, 95], [80, 95], [60, 17.5], [60, 115.5]],
  cut: [[60, 12.5], [60, 113.5], [24.5, 58], [95.5, 58], [42, 35], [78, 35], [42, 85.5], [78, 85.5]],
};

const SPARKS = [
  [6, 14], [92, 18], [2, 62], [96, 66], [24, 0], [76, 4], [-6, 38], [102, 40], [30, 94], [70, 92],
];

function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}
const n1 = (v: number) => Math.round(v * 10) / 10;

// One side of a wing as feather paths (the other side is the same group mirrored). Feathers fan from the shoulder of the
// shield: the top one is the longest and points up, the rest get shorter and sweep down.
function wingFeathers(kind: Spec["wing"], count: number) {
  const out: { d: string; spine: string }[] = [];
  const step = count > 3 ? 19 : 23;
  const reach = 30 + count * 4;
  for (let k = 0; k < count; k++) {
    const a = ((54 - k * step) * Math.PI) / 180;
    const L = reach - k * 4.5;
    const bx = 30;
    const by = 42 + k * 8.5;
    const ux = -Math.cos(a); // outward (left) and up
    const uy = -Math.sin(a);
    const nx = uy; // perpendicular; positive w is the upper edge of the feather
    const ny = -ux;
    const lead = (t: number, w: number) => `${n1(bx + ux * L * t + nx * w)} ${n1(by + uy * L * t + ny * w)}`;
    const tip = `${n1(bx + ux * L)} ${n1(by + uy * L)}`;
    let d: string;
    if (kind === "blade") d = `M${lead(0, 4)} L${lead(0.62, 7.5)} L${tip} L${lead(0.58, -0.5)} L${lead(0.36, -3.5)} L${lead(0.3, -0.5)} L${lead(0, -4)} Z`;
    else if (kind === "leaf") d = `M${lead(0, 2)} Q${lead(0.45, 10)} ${tip} Q${lead(0.5, -8)} ${lead(0, -3)} Z`;
    else if (kind === "flame") d = `M${lead(0, 4)} C${lead(0.3, 14)} ${lead(0.62, 1)} ${tip} C${lead(0.74, -7)} ${lead(0.42, 3)} ${lead(0.3, -6)} C${lead(0.2, -2)} ${lead(0.1, -6)} ${lead(0, -5)} Z`;
    else d = `M${lead(0, 4)} Q${lead(0.55, 10.5)} ${tip} Q${lead(0.55, -1.5)} ${lead(0, -4.5)} Z`;
    out.push({ d, spine: `M${lead(0.04, 0)} L${lead(0.8, kind === "leaf" ? 0.5 : 3)}` });
  }
  return out;
}

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
  const uid = useId().replace(/:/g, "");
  const i = Math.min(tierIndex, TIERS.length - 1);
  const tier = TIERS[i];
  const sp = SPECS[i];
  const c = locked ? "#5c6177" : tier.color;
  const g = locked ? "#8d93a8" : tier.glow;
  const gemC = locked ? "#7c8196" : sp.gemColor;
  const ink = mix(c, "#07060c", 0.82); // outline
  const hi = mix(g, "#ffffff", 0.45);
  const lite = mix(c, "#ffffff", 0.32); // metal highlight that still reads as the tier colour
  const dark = mix(c, "#07060c", 0.5);
  const detail = size >= 48; // rivets and engraving turn to noise on tiny crests
  const showFx = effects && !locked && size >= 56;
  const glowPx = Math.round(size * (0.05 + sp.aura * 0.035));
  const style = { width: size, height: size, ["--c" as string]: tier.color, ["--g" as string]: tier.glow } as CSSProperties;
  const u = (name: string) => `url(#${name}${uid})`;
  const feathers = wingFeathers(sp.wing, sp.wings);
  const roman = division ? ["", "I", "II", "III", "IV"][division] : null;

  return (
    <div className={`relative inline-block ${className}`} style={style} role="img" aria-label={`Insignia ${tier.name}${locked ? " (bloqueada)" : ""}`}>
      {showFx && sp.aura > 0 && <span aria-hidden className="rank-aura" style={{ opacity: 0.35 + sp.aura * 0.1 }} />}
      {showFx && sp.rays && <span aria-hidden className="rank-rays" />}
      <svg
        width={size}
        height={size}
        viewBox="0 -4 120 138"
        className={`relative ${locked ? "grayscale" : "hx-bob"}`}
        style={{ filter: locked ? "drop-shadow(0 4px 4px rgba(0,0,0,.4))" : `drop-shadow(0 0 ${glowPx}px ${tier.color}) drop-shadow(0 5px 6px rgba(0,0,0,.5))`, overflow: "visible" }}
      >
        <defs>
          {/* Polished metal: light, shade, light again. The second band is what makes it read as a curved plate. */}
          <linearGradient id={`m${uid}`} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor={lite} />
            <stop offset="0.16" stopColor={c} />
            <stop offset="0.42" stopColor={mix(c, "#07060c", 0.18)} />
            <stop offset="0.66" stopColor={dark} />
            <stop offset="0.84" stopColor={c} />
            <stop offset="1" stopColor={lite} />
          </linearGradient>
          <linearGradient id={`bv${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0.1" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={`gr${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.75" />
            <stop offset="0.55" stopColor="#000" stopOpacity="0.2" />
            <stop offset="1" stopColor={hi} stopOpacity="0.8" />
          </linearGradient>
          <radialGradient id={`en${uid}`} cx="0.5" cy="0.34" r="0.78">
            <stop offset="0" stopColor={mix(c, "#07060c", 0.3)} />
            <stop offset="0.55" stopColor={mix(c, "#07060c", 0.68)} />
            <stop offset="1" stopColor="#06050b" />
          </radialGradient>
          <linearGradient id={`gl${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.04" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`w${uid}`} gradientUnits="userSpaceOnUse" x1="-18" y1="10" x2="34" y2="74">
            <stop offset="0" stopColor={lite} />
            <stop offset="0.45" stopColor={c} />
            <stop offset="1" stopColor={dark} />
          </linearGradient>
          <linearGradient id={`fl${uid}`} gradientUnits="userSpaceOnUse" x1="-18" y1="10" x2="34" y2="74">
            <stop offset="0" stopColor="#fff3b0" />
            <stop offset="0.4" stopColor="#ffab2e" />
            <stop offset="1" stopColor="#c81d2b" />
          </linearGradient>
          <radialGradient id={`gm${uid}`} cx="0.36" cy="0.3" r="0.85">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.28" stopColor={mix(gemC, "#ffffff", 0.45)} />
            <stop offset="0.7" stopColor={gemC} />
            <stop offset="1" stopColor={mix(gemC, "#07060c", 0.6)} />
          </radialGradient>
          <linearGradient id={`cl${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={mix(c, "#07060c", 0.3)} />
            <stop offset="1" stopColor={mix(c, "#07060c", 0.66)} />
          </linearGradient>
          <linearGradient id={`st${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f4f6fb" />
            <stop offset="0.5" stopColor="#c3c9d8" />
            <stop offset="0.5" stopColor="#8990a5" />
            <stop offset="1" stopColor="#5d6379" />
          </linearGradient>
          <pattern id={`ht${uid}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
            <rect width="1.1" height="4" fill="#fff" opacity="0.07" />
          </pattern>
          <clipPath id={`ci${uid}`}>
            <path d={INNER[sp.body]} />
          </clipPath>
        </defs>

        {/* Sun rays behind everything */}
        {sp.back === "sun" && (
          <g fill={u("m")} stroke={ink} strokeWidth="0.8" strokeLinejoin="round">
            {Array.from({ length: 14 }, (_, k) => {
              const long = k % 2 === 0;
              return <polygon key={k} points={`60,${long ? -14 : 0} 64.5,34 55.5,34`} transform={`rotate(${k * (360 / 14)} 60 60)`} opacity={long ? 1 : 0.85} />;
            })}
          </g>
        )}

        {/* Crystal shards */}
        {sp.back === "shards" &&
          [-74, -44, -16, 16, 44, 74, -104, 104].map((deg, k) => {
            const len = k < 6 ? (k === 2 || k === 3 ? 62 : 54) : 44;
            return (
              <g key={deg} transform={`rotate(${deg} 60 62)`} stroke={ink} strokeWidth="0.9" strokeLinejoin="round">
                <polygon points={`60,${62 - len} 67,${62 - len + 16} 60,40 53,${62 - len + 16}`} fill={mix(g, "#ffffff", 0.35)} />
                <polygon points={`60,${62 - len} 67,${62 - len + 16} 60,40`} fill={c} />
                <polygon points={`60,${62 - len + 9} 63.5,${62 - len + 17} 60,40`} fill="#fff" opacity="0.55" stroke="none" />
              </g>
            );
          })}

        {/* Halo: two rune rings turning against each other */}
        {sp.halo && !locked && (
          <g fill="none" stroke={g}>
            <ellipse cx="60" cy="62" rx="57" ry="20" strokeWidth="1.8" strokeDasharray="4 8" opacity="0.85" transform="rotate(-16 60 62)">
              <animateTransform attributeName="transform" type="rotate" from="-16 60 62" to="344 60 62" dur="16s" repeatCount="indefinite" />
            </ellipse>
            {sp.aura >= 4 && (
              <ellipse cx="60" cy="62" rx="60" ry="15" strokeWidth="1" strokeDasharray="1 5" opacity="0.7" transform="rotate(20 60 62)">
                <animateTransform attributeName="transform" type="rotate" from="380 60 62" to="20 60 62" dur="22s" repeatCount="indefinite" />
              </ellipse>
            )}
          </g>
        )}

        {/* Crossed swords */}
        {sp.swords &&
          [-36, 36].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 60 66)`} stroke={ink} strokeWidth="0.9" strokeLinejoin="round">
              <path d="M60 -14 L64 -4 L64 100 L56 100 L56 -4 Z" fill={u("st")} />
              <path d="M60 -8 L60 98" stroke="#fff" strokeOpacity="0.55" strokeWidth="0.7" />
              <path d="M46 99 Q60 95 74 99 L74 104 Q60 100 46 104 Z" fill={u("m")} />
              <rect x="57.2" y="103" width="5.6" height="13" rx="1.4" fill={mix(c, "#07060c", 0.6)} />
              <circle cx="60" cy="119.5" r="4" fill={u("m")} />
              <circle cx="60" cy="119.5" r="1.6" fill={gemC} stroke="none" />
            </g>
          ))}

        {/* Wings: one side drawn, the other mirrored */}
        {feathers.length > 0 &&
          [false, true].map((flip) => (
            <g key={String(flip)} transform={flip ? "translate(120 0) scale(-1 1)" : undefined} strokeLinejoin="round">
              {feathers.map((f, k) => (
                <g key={k}>
                  <path d={f.d} fill={sp.wing === "flame" && !locked ? u("fl") : u("w")} stroke={ink} strokeWidth="1.1" />
                  <path d={f.spine} fill="none" stroke={sp.wing === "flame" ? "#fff6c8" : "#fff"} strokeOpacity="0.6" strokeWidth="0.8" strokeLinecap="round" />
                </g>
              ))}
              {/* Shoulder plate that holds the feathers */}
              <path d={`M33 ${36} Q24 ${40 + feathers.length * 4} 33 ${48 + feathers.length * 8.5} Z`} fill={u("m")} stroke={ink} strokeWidth="1" />
            </g>
          ))}

        {/* Horns */}
        {sp.horns &&
          [false, true].map((flip) => (
            <g key={String(flip)} transform={flip ? "translate(120 0) scale(-1 1)" : undefined} strokeLinejoin="round">
              <path d="M36 24 C20 24 6 10 8 -10 C14 4 24 10 42 14 Z" fill={locked ? "#8d93a8" : "#efe3cc"} stroke={ink} strokeWidth="1.1" />
              <path d="M36 24 C24 22 14 14 10 0 C18 10 28 14 42 14 Z" fill="#000" opacity="0.28" />
              <path d="M15 4 L20 1 M20 11 L25 7 M27 16 L31 11" stroke={ink} strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
            </g>
          ))}

        {/* Crown */}
        {sp.crown >= 1 && (
          <g strokeLinejoin="round">
            <path
              d={
                sp.crown === 1
                  ? "M42 27 L39 9 L50 17 L60 3 L70 17 L81 9 L78 27 Z"
                  : sp.crown === 2
                    ? "M34 28 L30 8 L41 17 L46 3 L54 14 L60 -5 L66 14 L74 3 L79 17 L90 8 L86 28 Z"
                    : "M30 29 L24 5 L38 16 L43 -2 L53 13 L60 -12 L67 13 L77 -2 L82 16 L96 5 L90 29 Z"
              }
              fill={u("m")}
              stroke={ink}
              strokeWidth="1.2"
            />
            <path d={sp.crown === 1 ? "M42 22.5 L78 22.5" : sp.crown === 2 ? "M34 23 L86 23" : "M29.5 23.5 L90.5 23.5"} stroke={ink} strokeWidth="0.9" opacity="0.7" />
            {(sp.crown === 1 ? [[39, 9], [60, 3], [81, 9]] : sp.crown === 2 ? [[30, 8], [46, 3], [60, -5], [74, 3], [90, 8]] : [[24, 5], [43, -2], [60, -12], [77, -2], [96, 5]]).map(([x, y], k) => (
              <circle key={k} cx={x} cy={y} r={k === (sp.crown === 1 ? 1 : 2) ? 2.6 : 1.9} fill={u("gm")} stroke={ink} strokeWidth="0.7" />
            ))}
          </g>
        )}

        {/* Shield: outline, metal plate, bevel, recessed enamel field */}
        <path d={BODY[sp.body]} fill={ink} stroke={ink} strokeWidth="3.4" strokeLinejoin="round" />
        <path d={BODY[sp.body]} fill={u("m")} strokeLinejoin="round" />
        <path d={BODY[sp.body]} fill="none" stroke={u("bv")} strokeWidth="1.8" strokeLinejoin="round" />
        <path d={INNER[sp.body]} fill={u("en")} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
        <path d={INNER[sp.body]} fill="none" stroke={u("gr")} strokeWidth="1.3" strokeLinejoin="round" />
        <g clipPath={u("ci")}>
          {detail && <rect x="18" y="4" width="84" height="120" fill={u("ht")} />}
          {/* Engraving: chevrons below the gem, a fan of lines above */}
          {detail && (
            <g fill="none" stroke={g} strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
              <path d="M46 88 L60 98 L74 88 M50 83.5 L60 90.5 L70 83.5" strokeWidth="1.1" />
              <path d="M60 26 L60 33 M51 29.5 L54 35 M69 29.5 L66 35" strokeWidth="1" />
              <path d="M36 52 q4 8 0 16 M84 52 q-4 8 0 16" strokeWidth="1" />
            </g>
          )}
          <path d="M14 0 H106 V60 Q60 44 14 60 Z" fill={u("gl")} />
        </g>

        {/* Battle damage */}
        {sp.worn && detail && (
          <g fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
            <path d="M93 34 l-4.5 5 l3 3.5 l-4 5.5" strokeWidth="1.1" />
            <path d="M27 76 l3.5 2.5 l-1.5 4" strokeWidth="1" />
            <path d="M23 44 l3 2.5 l-3 2.5 Z" fill={ink} strokeWidth="0.6" />
          </g>
        )}

        {/* Rivets */}
        {detail &&
          RIVETS[sp.body].map(([x, y], k) => (
            <g key={k}>
              <circle cx={x} cy={y} r="1.9" fill={ink} />
              <circle cx={x} cy={y} r="1.35" fill={g} />
              <circle cx={x - 0.4} cy={y - 0.45} r="0.55" fill="#fff" opacity="0.9" />
            </g>
          ))}

        {/* Gem in its bezel */}
        {sp.gem === "round" && (
          <g>
            <circle cx="60" cy="62" r="18.5" fill={u("m")} stroke={ink} strokeWidth="1.3" />
            <circle cx="60" cy="62" r="18.5" fill="none" stroke={u("bv")} strokeWidth="1" />
            <circle cx="60" cy="62" r="13.5" fill={u("gm")} stroke={ink} strokeWidth="1.2" />
            <ellipse cx="55" cy="56.5" rx="4.6" ry="3" fill="#fff" opacity="0.8" transform="rotate(-32 55 56.5)" />
            <path d="M51 68 Q60 74.5 69 68" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
            {[0, 90, 180, 270].map((deg) => (
              <rect key={deg} x="58.6" y="43.2" width="2.8" height="4.6" rx="1" fill={hi} stroke={ink} strokeWidth="0.6" transform={`rotate(${deg + 45} 60 62)`} />
            ))}
          </g>
        )}
        {sp.gem === "diamond" && (
          <g strokeLinejoin="round">
            <polygon points="60,33 85,61 60,95 35,61" fill={u("m")} stroke={ink} strokeWidth="1.3" />
            <polygon points="60,33 85,61 60,95 35,61" fill="none" stroke={u("bv")} strokeWidth="1" />
            <polygon points="60,39 80,61 60,88.5 40,61" fill={gemC} stroke={ink} strokeWidth="1.1" />
            <polygon points="60,39 80,61 69,61 60,50" fill={mix(gemC, "#ffffff", 0.3)} />
            <polygon points="60,39 40,61 51,61 60,50" fill={mix(gemC, "#ffffff", 0.62)} />
            <polygon points="60,50 69,61 60,73 51,61" fill={mix(gemC, "#ffffff", 0.82)} />
            <polygon points="40,61 51,61 60,73 60,88.5" fill={mix(gemC, "#07060c", 0.18)} />
            <polygon points="80,61 69,61 60,73 60,88.5" fill={mix(gemC, "#07060c", 0.45)} />
            <path d="M60 39 L60 50 M40 61 L51 61 M80 61 L69 61 M60 73 L60 88.5" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.6" />
          </g>
        )}
        {sp.gem === "emerald" && (
          <g strokeLinejoin="round">
            <polygon points="48,35 72,35 84,50 84,74 72,91 48,91 36,74 36,50" fill={u("m")} stroke={ink} strokeWidth="1.3" />
            <polygon points="48,35 72,35 84,50 84,74 72,91 48,91 36,74 36,50" fill="none" stroke={u("bv")} strokeWidth="1" />
            <polygon points="50,40 70,40 79,52 79,72 70,86 50,86 41,72 41,52" fill={mix(gemC, "#07060c", 0.3)} stroke={ink} strokeWidth="1.1" />
            <polygon points="50,40 70,40 66,48 54,48" fill={mix(gemC, "#ffffff", 0.55)} />
            <polygon points="50,40 54,48 48,55 41,52" fill={mix(gemC, "#ffffff", 0.3)} />
            <polygon points="41,52 48,55 48,69 41,72" fill={gemC} />
            <polygon points="79,52 72,55 72,69 79,72" fill={mix(gemC, "#07060c", 0.25)} />
            <polygon points="70,40 79,52 72,55 66,48" fill={mix(gemC, "#ffffff", 0.12)} />
            <polygon points="54,48 66,48 72,55 72,69 66,78 54,78 48,69 48,55" fill={mix(gemC, "#ffffff", 0.72)} />
            <polygon points="54,48 66,48 60,63" fill="#fff" opacity="0.55" />
            <path d="M54 78 L50 86 M66 78 L70 86 M48 69 L41 72 M72 69 L79 72" stroke="#fff" strokeOpacity="0.4" strokeWidth="0.6" />
          </g>
        )}
        {sp.gem === "star" && (
          <g strokeLinejoin="round">
            <circle cx="60" cy="62" r="23.5" fill={u("m")} stroke={ink} strokeWidth="1.3" />
            <circle cx="60" cy="62" r="23.5" fill="none" stroke={u("bv")} strokeWidth="1" />
            <circle cx="60" cy="62" r="19.5" fill={mix(gemC, "#07060c", 0.78)} stroke={ink} strokeWidth="1" />
            {detail && <circle cx="60" cy="62" r="16.5" fill="none" stroke={gemC} strokeOpacity="0.55" strokeWidth="0.7" strokeDasharray="1.5 2.6" />}
            {[0, 72, 144, 216, 288].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 60 62)`}>
                <polygon points="60,40.5 65.2,54.9 60,62" fill={mix(gemC, "#07060c", 0.12)} />
                <polygon points="60,40.5 54.8,54.9 60,62" fill={mix(gemC, "#ffffff", 0.6)} />
              </g>
            ))}
            <polygon points="60,40.5 65.2,54.9 80.4,55.4 68.4,64.7 72.6,79.4 60,70.8 47.4,79.4 51.6,64.7 39.6,55.4 54.8,54.9" fill="none" stroke={ink} strokeWidth="1" />
            <circle cx="60" cy="62" r="3.4" fill="#fff" opacity="0.92" />
          </g>
        )}
        {!locked && (
          <circle cx="53" cy="50" r="2.2" fill="#fff">
            <animate attributeName="opacity" values="0.1;1;0.1" dur="2.4s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Banner with the division */}
        <g strokeLinejoin="round">
          <path d="M37 119 L24 115 L28.5 122 L24 129.5 L38 131 Z" fill={mix(c, "#07060c", 0.72)} stroke={ink} strokeWidth="1" />
          <path d="M83 119 L96 115 L91.5 122 L96 129.5 L82 131 Z" fill={mix(c, "#07060c", 0.72)} stroke={ink} strokeWidth="1" />
          <path d="M33 116 Q60 124.5 87 116 L87 128 Q60 136.5 33 128 Z" fill={u("cl")} stroke={ink} strokeWidth="1.1" />
          <path d="M35 118.6 Q60 126.6 85 118.6" fill="none" stroke={g} strokeOpacity="0.75" strokeWidth="0.7" />
          <path d="M35 126.2 Q60 134.2 85 126.2" fill="none" stroke={g} strokeOpacity="0.4" strokeWidth="0.7" />
          {roman ? (
            <text x="60" y="131.2" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fontSize="8.6" letterSpacing="0.6" fill={hi} stroke={ink} strokeWidth="0.35" paintOrder="stroke">
              {roman}
            </text>
          ) : (
            <polygon points="60,122.4 61.6,126.2 65.6,126.5 62.5,129.1 63.5,133 60,130.8 56.5,133 57.5,129.1 54.4,126.5 58.4,126.2" fill={hi} stroke={ink} strokeWidth="0.5" />
          )}
        </g>
      </svg>
      {showFx && <span aria-hidden className="rank-sheen" />}
      {showFx &&
        SPARKS.slice(0, sp.sparks).map(([x, y], k) => (
          <span key={k} aria-hidden className="rank-spark" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(k * 0.37) % 2}s` }} />
        ))}
      {locked && (
        <span aria-hidden className="absolute inset-0 grid place-items-center" style={{ fontSize: size * 0.3 }}>
          🔒
        </span>
      )}
    </div>
  );
}
