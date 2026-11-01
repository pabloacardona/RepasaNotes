import { useId, type CSSProperties, type ReactNode } from "react";

// Vector medal for an achievement: a faceted frame in the rarity colour, a hand-drawn glyph and a glow that grows with the tier.
// Locked ones are a dark silhouette with a padlock.
type Glyph = (g: { fill: string; ink: string }) => ReactNode;

const GLYPHS: Record<string, Glyph> = {
  // Crossed swords
  quizzes: ({ fill, ink }) => (
    <g stroke={ink} strokeWidth="1.2" strokeLinejoin="round">
      <g transform="rotate(45 32 32)">
        <path d="M30 10 L34 10 L34 40 L30 40 Z" fill={fill} />
        <path d="M30 10 L32 5 L34 10 Z" fill={fill} />
        <rect x="24" y="40" width="16" height="4" rx="2" fill="#c9a24d" />
        <rect x="30" y="44" width="4" height="9" rx="1.5" fill="#8a5a2b" />
      </g>
      <g transform="rotate(-45 32 32)">
        <path d="M30 10 L34 10 L34 40 L30 40 Z" fill={fill} />
        <path d="M30 10 L32 5 L34 10 Z" fill={fill} />
        <rect x="24" y="40" width="16" height="4" rx="2" fill="#c9a24d" />
        <rect x="30" y="44" width="4" height="9" rx="1.5" fill="#8a5a2b" />
      </g>
    </g>
  ),
  // Light bulb
  correct: ({ fill, ink }) => (
    <g stroke={ink} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M32 11 C22 11 17 19 17 26 C17 32 20 35 23 39 C25 41 25 44 25 45 L39 45 C39 44 39 41 41 39 C44 35 47 32 47 26 C47 19 42 11 32 11 Z" fill={fill} />
      <rect x="26" y="47" width="12" height="4" rx="2" fill="#9aa3b2" />
      <rect x="28" y="52" width="8" height="3.5" rx="1.75" fill="#9aa3b2" />
      <path d="M27 24 C28 20 31 19 33 19" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  // Scroll
  notes: ({ fill, ink }) => (
    <g stroke={ink} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M20 14 H46 V46 C46 49 44 51 41 51 H18 C21 51 22 49 22 46 V16 C22 15 21 14 20 14 Z" fill={fill} />
      <path d="M20 14 C16 14 15 17 17 19 C18 20 20 20 22 20" fill="none" />
      <path d="M18 51 C14 51 13 47 16 46 C18 45 20 46 22 46" fill="none" />
      <g stroke={ink} strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round">
        <path d="M28 24 H41" />
        <path d="M28 30 H41" />
        <path d="M28 36 H37" />
      </g>
    </g>
  ),
  // Compass
  topics: ({ fill, ink }) => (
    <g stroke={ink} strokeWidth="1.2" strokeLinejoin="round">
      <circle cx="32" cy="32" r="19" fill={fill} />
      <circle cx="32" cy="32" r="15" fill="#0b1020" fillOpacity=".55" />
      <path d="M32 18 L36 32 L32 46 L28 32 Z" fill="#ff5a5a" />
      <path d="M32 46 L36 32 L32 18" fill="none" />
      <path d="M18 32 L32 28 L46 32 L32 36 Z" fill="#fff" fillOpacity=".85" />
      <circle cx="32" cy="32" r="2.4" fill="#222" />
    </g>
  ),
  // Flame
  combo: ({ ink }) => (
    <g stroke={ink} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M32 8 C34 18 46 24 46 38 C46 48 40 55 32 55 C24 55 18 48 18 38 C18 31 23 28 25 22 C27 26 29 27 30 27 C31 21 31 14 32 8 Z" fill="#ff7a1a" />
      <path d="M32 28 C33 34 40 37 40 44 C40 50 36 54 32 54 C28 54 24 50 24 44 C24 40 28 38 29 34 C30 36 31 36 31 36 C31 33 32 31 32 28 Z" fill="#ffd24d" />
      <ellipse cx="32" cy="47" rx="3.5" ry="5" fill="#fff6c8" stroke="none" />
    </g>
  ),
  // Diamond
  perfect: ({ fill, ink }) => (
    <g stroke={ink} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M20 22 L26 14 H38 L44 22 L32 52 Z" fill={fill} />
      <path d="M20 22 H44" fill="none" />
      <path d="M26 14 L29 22 L32 52 M38 14 L35 22 L32 52" fill="none" strokeOpacity=".6" />
      <path d="M26 14 L32 22 L38 14" fill="none" strokeOpacity=".6" />
      <path d="M23 20 L27 15" stroke="#fff" strokeOpacity=".9" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  // Horned helm
  hard: ({ fill, ink }) => (
    <g stroke={ink} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M18 34 C18 22 24 16 32 16 C40 16 46 22 46 34 L46 44 L40 50 L24 50 L18 44 Z" fill={fill} />
      <path d="M18 30 C12 28 9 22 10 15 C14 19 18 21 21 21" fill="#f1e3c0" />
      <path d="M46 30 C52 28 55 22 54 15 C50 19 46 21 43 21" fill="#f1e3c0" />
      <path d="M24 34 H40 V40 H24 Z" fill="#0b1020" fillOpacity=".8" />
      <path d="M32 34 V46" stroke={ink} strokeOpacity=".6" strokeWidth="2" />
      <circle cx="27.5" cy="37" r="1.4" fill="#ff6b6b" stroke="none" />
      <circle cx="36.5" cy="37" r="1.4" fill="#ff6b6b" stroke="none" />
    </g>
  ),
  // Candle
  days: ({ fill, ink }) => (
    <g stroke={ink} strokeWidth="1.2" strokeLinejoin="round">
      <rect x="24" y="30" width="16" height="23" rx="3" fill={fill} />
      <path d="M24 36 C28 38 30 34 33 37 C36 40 38 36 40 37" fill="none" strokeOpacity=".5" />
      <path d="M32 29 V26" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M32 8 C35 14 38 16 38 21 C38 25 35 27 32 27 C29 27 26 25 26 21 C26 17 30 14 32 8 Z" fill="#ffb020" />
      <ellipse cx="32" cy="22" rx="2.4" ry="3.6" fill="#fff6c8" stroke="none" />
    </g>
  ),
  // Castle
  conquered: ({ fill, ink }) => (
    <g stroke={ink} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M14 52 V24 H20 V20 H24 V24 H28 V20 H36 V24 H40 V20 H44 V24 H50 V52 Z" fill={fill} />
      <path d="M26 52 V40 C26 36 38 36 38 40 V52 Z" fill="#0b1020" fillOpacity=".75" />
      <path d="M32 20 V10 L42 13.5 L32 17" fill="#ff5a5a" />
      <path d="M32 20 V8" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="17" y="30" width="3" height="6" rx="1" fill="#0b1020" fillOpacity=".7" stroke="none" />
      <rect x="44" y="30" width="3" height="6" rx="1" fill="#0b1020" fillOpacity=".7" stroke="none" />
    </g>
  ),
  // Wings
  climb: ({ fill, ink }) => (
    <g stroke={ink} strokeWidth="1.2" strokeLinejoin="round">
      <path d="M30 40 C20 40 11 32 8 20 C14 22 18 22 21 21 C16 18 14 14 13 10 C20 14 26 17 31 23 Z" fill={fill} />
      <path d="M34 40 C44 40 53 32 56 20 C50 22 46 22 43 21 C48 18 50 14 51 10 C44 14 38 17 33 23 Z" fill={fill} />
      <path d="M22 28 C26 29 28 31 30 34 M42 28 C38 29 36 31 34 34" fill="none" strokeOpacity=".5" />
      <path d="M32 18 L35 28 L32 46 L29 28 Z" fill="#ffd24d" />
    </g>
  ),
};

export function AchievementIcon({
  id,
  color,
  tier,
  size = 64,
  locked = false,
  className = "",
}: {
  id: string;
  color: string;
  tier: number;
  size?: number;
  locked?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const glyph = GLYPHS[id];
  const c = locked ? "#4a5068" : color;
  const glow = locked ? 0 : 4 + tier * 3;
  const style: CSSProperties = { width: size, height: size, filter: locked ? "drop-shadow(0 3px 4px rgba(0,0,0,.4))" : `drop-shadow(0 0 ${glow}px ${color}) drop-shadow(0 3px 4px rgba(0,0,0,.45))` };
  return (
    <span className={`relative inline-block ${className}`} style={style} aria-hidden>
      <svg viewBox="0 0 64 64" width={size} height={size} className={locked ? "" : "hx-bob"}>
        <defs>
          <linearGradient id={`fr${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="0.3" stopColor={c} />
            <stop offset="1" stopColor={c} stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id={`bg${uid}`} cx="0.5" cy="0.3" r="0.85">
            <stop offset="0" stopColor={c} stopOpacity={locked ? 0.2 : 0.5} />
            <stop offset="1" stopColor="#0a0612" stopOpacity="0.95" />
          </radialGradient>
          <linearGradient id={`gl${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor={c} />
          </linearGradient>
        </defs>
        <path d="M32 2 L58 16 L58 48 L32 62 L6 48 L6 16 Z" fill={`url(#fr${uid})`} />
        <path d="M32 7 L53 18.5 L53 45.5 L32 57 L11 45.5 L11 18.5 Z" fill={`url(#bg${uid})`} stroke="#fff" strokeOpacity={locked ? 0.1 : 0.28} />
        {tier >= 3 && !locked && <path d="M32 2 L58 16 L58 48 L32 62 L6 48 L6 16 Z" fill="none" stroke="#fff" strokeOpacity="0.5" strokeDasharray="3 5" />}
        {locked ? (
          <g fill="#7b839c">
            <rect x="21" y="29" width="22" height="17" rx="3" />
            <path d="M25 29 V25 C25 20 39 20 39 25 V29" fill="none" stroke="#7b839c" strokeWidth="4" strokeLinecap="round" />
            <circle cx="32" cy="37" r="2.4" fill="#2a3048" />
          </g>
        ) : glyph ? (
          <g transform="translate(0 1)">{glyph({ fill: `url(#gl${uid})`, ink: "rgba(10,6,18,0.7)" })}</g>
        ) : null}
        <path d="M32 7 L53 18.5 L32 30 L11 18.5 Z" fill="#fff" opacity={locked ? 0.03 : 0.12} />
      </svg>
    </span>
  );
}
