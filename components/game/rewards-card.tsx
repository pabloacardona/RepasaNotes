"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { celebrate } from "@/components/confetti";
import { RankEmblem } from "./rank-emblem";
import { AchievementIcon } from "./achievement-icon";
import { RankUpOverlay } from "./rank-up-overlay";

export type RankLite = { tierIndex: number; division: number | null; label: string; pct: number; toNext: number };
export type Reward = {
  xpGain: number;
  from: RankLite;
  to: RankLite;
  promoted: boolean;
  unlocked: { id: string; emoji: string; name: string; text: string; tier: number; rarity: { name: string; color: string } }[];
  dailyDone: boolean;
  questsDone: boolean; // all three daily quests finished with this quiz: the quest bonus was just claimed
};

// What the quiz earned, in one row: XP, the rank bar and small chips for anything unlocked.
// A promotion gets its own full-screen scene (RankUpOverlay); everything else stays quiet.
export function RewardsCard({ reward, fresh }: { reward: Reward; fresh: boolean }) {
  const reduce = useReducedMotion();
  const [shownXp, setShownXp] = useState(fresh ? 0 : reward.xpGain);
  const [reveal, setReveal] = useState(!fresh);
  const [up, setUp] = useState(false);

  useEffect(() => {
    if (!fresh) return;
    const t1 = setTimeout(() => setShownXp(reward.xpGain), reduce ? 0 : 400);
    const t2 = setTimeout(
      () => {
        setReveal(true);
        if (reward.promoted) setUp(true);
        else if (reward.unlocked.length > 0 || reward.questsDone) celebrate();
      },
      reduce ? 0 : 1300,
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fresh, reward.xpGain, reward.unlocked.length, reward.promoted, reward.questsDone, reduce]);

  const shown = reveal ? reward.to : reward.from;

  return (
    <div className="hx-panel p-4">
      <AnimatePresence>{up && <RankUpOverlay from={reward.from} to={reward.to} onClose={() => setUp(false)} />}</AnimatePresence>

      <div className="flex items-center gap-3">
        <RankEmblem tierIndex={shown.tierIndex} division={shown.division} size={52} effects={false} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display text-lg font-bold">
              {shown.label}
              {reveal && reward.promoted && <span className="ml-2 text-xs font-bold text-[var(--ok)]">▲ ascendiste</span>}
            </p>
            <p className="font-display text-lg font-bold tabular-nums text-[var(--hi)]">
              +<AnimatedNumber from={fresh ? 0 : reward.xpGain} value={shownXp} /> XP
            </p>
          </div>
          <div className="hx-bar mt-1.5">
            <span style={{ width: `${Math.max(shown.pct, 3)}%`, transition: "width 1.2s cubic-bezier(.16,1,.3,1)" }} />
          </div>
          <p className="hx-mute mt-1 text-xs">{reward.to.tierIndex >= 9 ? "En la cima de la escalera" : `${reward.to.toNext} XP para el siguiente rango`}</p>
        </div>
      </div>

      {reveal && (reward.unlocked.length > 0 || reward.dailyDone || reward.questsDone) && (
        <ul className="mt-3 flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
          {reward.questsDone && <li className="rounded-full border border-[var(--hi)] px-3 py-1 text-xs font-bold text-[var(--hi)]">🎁 Misiones del día completas · bonus reclamado</li>}
          {reward.dailyDone && <li className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold">☀️ Meta diaria cumplida</li>}
          {reward.unlocked.map((a, i) => (
            <motion.li
              key={a.id}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-center gap-2 rounded-full border py-0.5 pl-1 pr-3 text-xs font-semibold"
              style={{ borderColor: a.rarity.color }}
              title={a.text}
            >
              <AchievementIcon id={a.id} color={a.rarity.color} tier={a.tier} size={26} />
              <span>
                {a.name} <span style={{ color: a.rarity.color }}>· {a.rarity.name}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
