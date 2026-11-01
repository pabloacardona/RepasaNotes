import { useId } from "react";
import { TIERS } from "@/lib/ranks";

// Neon rank crest: a glowing hex frame around a faceted gem. Wings, a spinning halo and a crown appear as the tier rises.
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
  const uid = useId().replace(/:/g, "");
  const tier = TIERS[Math.min(tierIndex, TIERS.length - 1)];
  const c = locked ? "#4a536e" : tier.color;
  const glow = locked ? "#5b6683" : tier.glow;
  const wings = Math.min(1 + Math.floor(tierIndex / 2), 5);
  const halo = tierIndex >= 4;
  const crown = tierIndex >= 7;
  const pips = division ? 5 - division : 0; // IV = 1 pip ... I = 4 pips

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={`Emblema ${tier.name}`}
      className={`${locked ? "" : "hx-glow"} ${className}`}
      style={{ ["--glow" as string]: c, overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`f${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={glow} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        <linearGradient id={`g${uid}`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor={glow} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        <radialGradient id={`b${uid}`} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor={c} stopOpacity="0.5" />
          <stop offset="1" stopColor={c} stopOpacity="0.08" />
        </radialGradient>
      </defs>

      {/* Halo */}
      {halo && !locked && (
        <g>
          <circle cx="60" cy="56" r="50" fill="none" stroke={c} strokeWidth="1.2" strokeDasharray="3 9" opacity="0.7">
            <animateTransform attributeName="transform" type="rotate" from="0 60 56" to="360 60 56" dur="14s" repeatCount="indefinite" />
          </circle>
        </g>
      )}

      {/* Wings: thin neon blades */}
      {Array.from({ length: wings }, (_, i) => {
        const y = 52 + i * 6;
        const reach = 16 + i * 6;
        return (
          <g key={i} opacity={0.95 - i * 0.1} fill="none" stroke={`url(#f${uid})`} strokeWidth={2.2 - i * 0.2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points={`36,${y} ${36 - reach},${y - 12 - i * 2} ${36 - reach + 7},${y + 2}`} />
            <polyline points={`84,${y} ${84 + reach},${y - 12 - i * 2} ${84 + reach - 7},${y + 2}`} />
          </g>
        );
      })}

      {/* Crown */}
      {crown && (
        <g fill={`url(#f${uid})`}>
          <polygon points="60,2 55,22 65,22" />
          <polygon points="43,12 41,30 53,25" />
          <polygon points="77,12 79,30 67,25" />
        </g>
      )}

      {/* Frame */}
      <polygon points="60,14 92,32 92,72 60,100 28,72 28,32" style={{ fill: "var(--surface)" }} />
      <polygon points="60,14 92,32 92,72 60,100 28,72 28,32" fill={`url(#b${uid})`} stroke={`url(#f${uid})`} strokeWidth="3" strokeLinejoin="round" />
      <polygon points="60,22 85,36 85,69 60,92 35,69 35,36" fill="none" stroke={c} strokeWidth="0.8" opacity="0.55" />

      {/* Gem */}
      <polygon points="60,32 79,52 60,84 41,52" fill={`url(#g${uid})`} />
      <polygon points="60,32 79,52 60,52" fill="#ffffff" opacity="0.35" />
      <polygon points="60,52 41,52 60,84" fill="#000000" opacity="0.22" />
      <polygon points="60,32 79,52 60,84 41,52" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.8" />
      {!locked && (
        <circle cx="52" cy="46" r="2.4" fill="#fff" opacity="0.9">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="2.6s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Division pips */}
      {division ? (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={42 + i * 12} y={104} width="8" height="4" rx="2" fill={i < pips ? glow : "#2a3350"} opacity={i < pips ? 1 : 0.8} />
          ))}
        </g>
      ) : (
        <polygon points="60,100 65,108 60,116 55,108" fill={glow} />
      )}
    </svg>
  );
}
