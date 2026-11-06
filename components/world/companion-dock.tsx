"use client";

import { MascotStage } from "./mascot-stage";
import type { Mood } from "@/lib/mood";

// The player's two companions, drawn on top of the page. They never hide behind a card.
// - Wide and tall screens: each stands in its own corner, big, with its quote bubble.
// - Anything smaller: they do not fit in a corner, so the dock section turns on, a strip above the stats bar where
//   both stand side by side, always on screen. `DockSpacer` keeps the end of the page clear of it.
// The switch is plain CSS (see .cdock-* in globals.css), so there is no flash while the page loads.
export function CompanionDock({ mood, babyMood, streak }: { mood: Mood; babyMood: Mood; streak: number }) {
  return (
    <>
      <div className="cdock-wide">
        <MascotStage
          scrollToSwitch
          picker
          movable
          mood={mood}
          pulse={0}
          lastHit={null}
          streak={streak}
          className="fixed bottom-24 right-[max(1rem,3vw)] z-30 h-[min(38dvh,300px)] w-[min(20vw,270px)]"
        />
        <MascotStage
          slot="baby"
          scrollToSwitch
          picker
          movable
          mood={babyMood}
          pulse={0}
          lastHit={null}
          streak={0}
          bubbleClassName="hidden"
          className="fixed bottom-28 left-[max(1.5rem,5vw)] z-30 h-[min(20dvh,160px)] w-[min(10vw,135px)]"
        />
      </div>

      <div className="cdock-small pointer-events-none fixed inset-x-0 bottom-[4.25rem] z-30 items-end justify-center gap-2">
        <MascotStage
          slot="baby"
          picker
          movable
          mood={babyMood}
          pulse={0}
          lastHit={null}
          streak={0}
          bubbleClassName="hidden"
          className="relative h-[max(min(18dvh,135px),88px)] w-[108px]"
        />
        <MascotStage
          picker
          movable
          mood={mood}
          pulse={0}
          lastHit={null}
          streak={streak}
          bubbleClassName="hidden"
          className="relative h-[max(min(28dvh,210px),130px)] w-[176px]"
        />
      </div>
    </>
  );
}

/** Empty space at the end of a page, only while the small dock is on, so the last block can scroll clear of the mascots. */
export function DockSpacer() {
  return <div aria-hidden className="cdock-spacer" />;
}
