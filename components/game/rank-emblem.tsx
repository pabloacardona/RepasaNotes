import { useId } from "react";
import { TIERS } from "@/lib/ranks";

// Ranked crest: a faceted gem on a shield, with wings and spikes that grow with the tier.
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
  const c = locked ? "#3b4252" : tier.color;
  const glow = locked ? "#4b5566" : tier.glow;
  const wings = Math.min(1 + Math.floor(tierIndex / 2), 5);
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
      style={{ ["--glow" as string]: glow }}
    >
      <defs>
        <linearGradient id={`m${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0e6d2" />
          <stop offset="0.45" stopColor="#c8aa6e" />
          <stop offset="1" stopColor="#5a4420" />
        </linearGradient>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={glow} />
          <stop offset="0.5" stopColor={c} />
          <stop offset="1" stopColor="#0a1428" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={`r${uid}`} cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Wings */}
      {Array.from({ length: wings }, (_, i) => {
        const y = 46 + i * 7;
        const reach = 14 + i * 5;
        return (
          <g key={i} opacity={0.95 - i * 0.08}>
            <polygon points={`40,${y} ${40 - reach},${y - 8 - i * 2} ${40 - reach + 6},${y + 4} 38,${y + 10}`} fill={`url(#m${uid})`} />
            <polygon points={`80,${y} ${80 + reach},${y - 8 - i * 2} ${80 + reach - 6},${y + 4} 82,${y + 10}`} fill={`url(#m${uid})`} />
          </g>
        );
      })}

      {/* Crown spikes */}
      {crown && (
        <g fill={`url(#m${uid})`}>
          <polygon points="60,4 55,24 65,24" />
          <polygon points="44,14 42,32 54,26" />
          <polygon points="76,14 78,32 66,26" />
        </g>
      )}

      {/* Shield */}
      <polygon points="60,16 90,34 90,70 60,98 30,70 30,34" fill={`url(#m${uid})`} />
      <polygon points="60,21 85,36 85,68 60,92 35,68 35,36" fill="#07101e" />
      <polygon points="60,21 85,36 85,68 60,92 35,68 35,36" fill={c} opacity="0.18" />

      {/* Gem */}
      <polygon points="60,32 78,50 60,82 42,50" fill={`url(#g${uid})`} stroke={glow} strokeWidth="1" />
      <polygon points="60,32 78,50 60,50" fill="#ffffff" opacity="0.28" />
      <polygon points="60,50 42,50 60,82" fill="#000000" opacity="0.18" />
      <polygon points="60,32 78,50 60,82 42,50" fill={`url(#r${uid})`} opacity="0.5" />

      {/* Division pips */}
      {division ? (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <polygon
              key={i}
              points={`${42 + i * 12},104 ${46 + i * 12},100 ${50 + i * 12},104 ${46 + i * 12},108`}
              fill={i < pips ? glow : "#2a3142"}
              stroke="#c8aa6e"
              strokeWidth="0.6"
            />
          ))}
        </g>
      ) : (
        <polygon points="60,98 65,106 60,114 55,106" fill={glow} stroke="#c8aa6e" strokeWidth="0.6" />
      )}
    </svg>
  );
}
