// Slow layered waves along the bottom of the hero: calm, endless, no sudden movement.
export function Waves({ className = "" }: { className?: string }) {
  const layers = [
    { op: 0.1, dur: 70, h: 100, dir: 1 },
    { op: 0.16, dur: 48, h: 82, dir: -1 },
    { op: 0.24, dur: 34, h: 62, dir: 1 },
  ];
  return (
    <div aria-hidden className={`pointer-events-none overflow-hidden ${className}`}>
      {layers.map((l, i) => (
        <svg
          key={i}
          viewBox="0 0 400 80"
          preserveAspectRatio="none"
          className="wave-layer absolute bottom-0 left-0 w-[200%]"
          style={{ height: `${l.h}%`, opacity: l.op, animationDuration: `${l.dur}s`, animationDirection: l.dir > 0 ? "normal" : "reverse", color: "var(--b1)" }}
        >
          <path d="M0 40 Q 50 6 100 40 T 200 40 T 300 40 T 400 40 V80 H0 Z" fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}

// Concentric rings that spread slowly from a centre, like a drop on still water.
export function Ripples({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none grid place-items-center ${className}`}>
      {[0, 2.2, 4.4, 6.6].map((d) => (
        <span key={d} className="ripple-ring" style={{ animationDelay: `${d}s` }} />
      ))}
    </div>
  );
}
