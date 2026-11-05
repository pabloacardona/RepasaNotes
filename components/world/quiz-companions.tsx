"use client";

import { useSyncExternalStore } from "react";
import { FactBubble, MascotStage, SayBubble } from "./mascot-stage";
import { cheerFor, cheerSeconds, type CheerKind } from "@/lib/quotes";
import type { Mood } from "@/lib/mood";

const subscribe = () => () => {};

// Both companions of the quiz. The big one tells curious facts; the baby (half the size) cheers the player on after every
// answer. They stand side by side, centred above the question on a phone and together in the corner on a wide screen.
// On a phone there is no room beside them, so one shared line above the card says the cheer first and then the fact.
export function QuizCompanions({
  mood,
  babyMood,
  pulse,
  lastHit,
  streak,
}: {
  mood: Mood;
  babyMood: Mood;
  pulse: number;
  lastHit: boolean | null;
  streak: number;
}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const kind: CheerKind = lastHit === null ? "start" : lastHit ? (streak >= 3 ? "streak" : "hit") : "miss";
  const cheer = cheerFor(kind, pulse);

  return (
    <>
      <div className="pointer-events-none fixed left-1/2 top-[3.6rem] z-0 flex -translate-x-1/2 items-end gap-1 landscape:bottom-4 landscape:left-auto landscape:right-5 landscape:top-auto landscape:translate-x-0 landscape:flex-col-reverse landscape:items-end landscape:gap-1">
        <MascotStage
          slot="baby"
          picker
          scrollToSwitch
          mood={babyMood}
          pulse={pulse}
          lastHit={lastHit}
          streak={0}
          say={cheer}
          bubbleClassName="portrait:hidden !top-auto bottom-full mb-1"
          className="relative h-[12dvh] w-[84px] landscape:h-[min(18dvh,120px)] landscape:w-[min(11vw,110px)]"
        />
        <MascotStage
          picker
          scrollToSwitch
          mood={mood}
          pulse={pulse}
          lastHit={lastHit}
          streak={streak}
          bubbleClassName="portrait:hidden"
          className="relative h-[15dvh] w-[132px] landscape:h-[min(32dvh,250px)] landscape:w-[min(20vw,230px)]"
        />
      </div>

      {/* Phone (portrait): one line under the models. */}
      {hydrated && (
        <div aria-hidden className="pointer-events-none fixed inset-x-0 top-[calc(3.6rem+15dvh+0.5rem)] z-10 flex h-[9dvh] justify-center px-3 landscape:hidden">
          <div key={pulse} className="relative h-full w-full max-w-sm">
            <div className="absolute inset-0 flex items-center justify-center">
              <SayBubble text={cheer} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <FactBubble delay={cheerSeconds(cheer) + 0.3} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
