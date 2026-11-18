"use client";

import { useState } from "react";
import { RankLadder } from "./rank-ladder";

// "Camino de rangos" fold. The ladder is ten SVG crests, so it is built only the first time the fold is opened.
export function RankPath({ tierIndex, xp }: { tierIndex: number; xp: number }) {
  const [opened, setOpened] = useState(false);
  return (
    <details className="hx-panel group mb-6 p-4 sm:p-5" onToggle={(e) => e.currentTarget.open && setOpened(true)}>
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
        <span className="hx-kicker">Camino de rangos</span>
        <span aria-hidden className="text-xs transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="mt-4">{opened && <RankLadder tierIndex={tierIndex} xp={xp} />}</div>
    </details>
  );
}
