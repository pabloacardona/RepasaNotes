"use client";

// Plain night-sky background with square stars. The only motion: a short screen flash after each answer
// (green for a hit, red for a miss), drawn with steps() so it looks like a retro palette swap.
export function RetroBackdrop({ pulse = 0, lastHit = null }: { pulse?: number; lastHit?: boolean | null; streak?: number; calm?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="hx-bg" />
      {pulse > 0 && lastHit !== null && <div key={pulse} className={lastHit ? "hx-flash-hit" : "hx-flash-miss"} />}
    </div>
  );
}
