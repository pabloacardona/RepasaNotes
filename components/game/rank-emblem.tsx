import { useId, type CSSProperties } from "react";
import { TIERS } from "@/lib/ranks";

// Vector rank crest with light. Every tier has its own silhouette (shield, hex or diamond body; feather, leaf or
// flame wings; crown spikes; a halo; a gem that goes from round to faceted to a star) and its own light show:
// pulsing aura, turning rays, twinkling sparks and a sheen that sweeps across the crest. The glow grows with the tier.
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

const BODY = {
  shield: "M60 14 L97 26 L97 64 Q97 96 60 120 Q23 96 23 64 L23 26 Z",
  hex: "M60 10 L98 32 L98 82 L60 116 L22 82 L22 32 Z",
  diamond: "M60 6 L104 62 L60 120 L16 62 Z",
};
const INNER = {
  shield: "M60 24 L88 33 L88 63 Q88 88 60 108 Q32 88 32 63 L32 33 Z",
  hex: "M60 22 L89 39 L89 78 L60 104 L31 78 L31 39 Z",
  diamond: "M60 20 L92 62 L60 106 L28 62 Z",
};

const SPARKS = [
  [6, 14], [92, 18], [2, 62], [96, 66], [24, 0], [76, 4], [-6, 38], [102, 40], [30, 94], [70, 92],
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
  const uid = useId().replace(/:/g, "");
  const i = Math.min(tierIndex, TIERS.length - 1);
  const tier = TIERS[i];
  const sp = SPECS[i];
  const c = locked ? "#59607a" : tier.color;
  const g = locked ? "#8a91ab" : tier.glow;
  const pips = division ? 5 - division : 0; // IV = 1 pip ... I = 4 pips
  const showFx = effects && !locked && size >= 56;
  const glowPx = Math.round(size * (0.05 + sp.aura * 0.035));
  const style = { width: size, height: size, ["--c" as string]: tier.color, ["--g" as string]: tier.glow } as CSSProperties;

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
          <linearGradient id={`f${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.25" stopColor={g} />
            <stop offset="0.7" stopColor={c} />
            <stop offset="1" stopColor={c} stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id={`w${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={c} stopOpacity="0.15" />
            <stop offset="1" stopColor={g} />
          </linearGradient>
          <linearGradient id={`fl${uid}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ff3d00" />
            <stop offset="0.6" stopColor="#ffb300" />
            <stop offset="1" stopColor="#fff2a8" />
          </linearGradient>
          <radialGradient id={`b${uid}`} cx="0.5" cy="0.32" r="0.8">
            <stop offset="0" stopColor={c} stopOpacity="0.55" />
            <stop offset="1" stopColor="#050816" stopOpacity="0.96" />
          </radialGradient>
          <linearGradient id={`g${uid}`} x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.3" stopColor={g} />
            <stop offset="1" stopColor={c} />
          </linearGradient>
        </defs>

        {/* Halo */}
        {sp.halo && !locked && (
          <ellipse cx="60" cy="62" rx="56" ry="20" fill="none" stroke={g} strokeWidth="2" strokeDasharray="4 8" opacity="0.8" transform="rotate(-16 60 62)">
            <animateTransform attributeName="transform" type="rotate" from="-16 60 62" to="344 60 62" dur="16s" repeatCount="indefinite" />
          </ellipse>
        )}

        {/* Wings */}
        {Array.from({ length: sp.wings }, (_, k) => {
          const y = 50 + k * 9;
          const r = 20 + k * 7;
          const op = 0.98 - k * 0.08;
          const fill = sp.wing === "flame" ? `url(#fl${uid})` : `url(#w${uid})`;
          const stroke = sp.wing === "flame" ? "#ffd27a" : g;
          const left =
            sp.wing === "leaf"
              ? `M30 ${y} C ${30 - r * 0.4} ${y - 22 - k * 3}, ${30 - r} ${y - 14 - k * 3}, ${30 - r - 4} ${y - 4} C ${30 - r * 0.6} ${y + 4}, ${30 - 6} ${y + 10}, 30 ${y + 6} Z`
              : sp.wing === "flame"
                ? `M30 ${y + 4} Q ${30 - r * 0.5} ${y - 8} ${30 - r} ${y - 20 - k * 3} Q ${30 - r * 0.9} ${y - 2} ${30 - r * 0.45} ${y + 2} Q ${30 - r * 0.8} ${y + 8} ${30 - r * 0.2} ${y + 12} Z`
                : `M30 ${y + 2} L ${30 - r} ${y - 18 - k * 3} L ${30 - r + 8} ${y - 4} L ${30 - r * 0.55} ${y + 4} L ${30 - r * 0.3} ${y + 10} Z`;
          // Mirror the left wing across x = 60.
          const right = left.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_m, x, yy) => `${120 - Number(x)} ${yy}`);
          return (
            <g key={k} opacity={op} fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round">
              <path d={left} />
              <path d={right} />
            </g>
          );
        })}

        {/* Crown */}
        {sp.crown >= 1 && (
          <g fill={`url(#f${uid})`} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1" strokeLinejoin="round">
            {sp.crown === 2 ? (
              <path d="M30 32 L38 4 L50 22 L60 -4 L70 22 L82 4 L90 32 Z" />
            ) : (
              <path d="M40 28 L46 8 L60 20 L74 8 L80 28 Z" />
            )}
          </g>
        )}

        {/* Body: frame, glass, inner rim */}
        <path d={BODY[sp.body]} fill={`url(#f${uid})`} stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.5" strokeLinejoin="round" />
        <path d={INNER[sp.body]} fill={`url(#b${uid})`} stroke={g} strokeOpacity="0.7" strokeWidth="1.5" strokeLinejoin="round" />
        <path d={INNER[sp.body]} fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="6" transform="translate(0 2)" />

        {/* Gem */}
        {sp.gem === "round" && (
          <g>
            <circle cx="60" cy="62" r="16" fill={`url(#g${uid})`} stroke="#fff" strokeOpacity="0.7" />
            <circle cx="54" cy="56" r="4.5" fill="#fff" opacity="0.85" />
          </g>
        )}
        {sp.gem === "diamond" && (
          <g strokeLinejoin="round">
            <polygon points="60,36 82,60 60,92 38,60" fill={`url(#g${uid})`} stroke="#fff" strokeOpacity="0.75" />
            <polygon points="60,36 82,60 60,60" fill="#fff" opacity="0.38" />
            <polygon points="60,60 38,60 60,92" fill="#000" opacity="0.22" />
            <polygon points="48,60 60,36 72,60" fill="none" stroke="#fff" strokeOpacity="0.5" />
          </g>
        )}
        {sp.gem === "star" && (
          <g strokeLinejoin="round">
            <polygon points="60,34 67,54 88,54 71,66 78,87 60,74 42,87 49,66 32,54 53,54" fill={`url(#g${uid})`} stroke="#fff" strokeOpacity="0.8" />
            <polygon points="60,34 67,54 60,60 53,54" fill="#fff" opacity="0.5" />
          </g>
        )}
        {!locked && (
          <circle cx="52" cy="50" r="2.6" fill="#fff">
            <animate attributeName="opacity" values="0.15;1;0.15" dur="2.4s" repeatCount="indefinite" />
          </circle>
        )}

        {/* Division pips */}
        {division ? (
          [0, 1, 2, 3].map((k) => <rect key={k} x={36 + k * 14} y={124} width="10" height="5" rx="2.5" fill={k < pips ? g : "#2a3050"} stroke={k < pips ? "#fff" : "none"} strokeOpacity="0.7" />)
        ) : (
          <polygon points="60,122 67,128 60,134 53,128" fill={g} stroke="#fff" strokeOpacity="0.7" />
        )}
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
