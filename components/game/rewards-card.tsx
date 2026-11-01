"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { celebrate } from "@/components/confetti";
import { RankEmblem } from "./rank-emblem";

export type RankLite = { tierIndex: number; division: number | null; label: string; pct: number; toNext: number };
export type Reward = {
  xpGain: number;
  from: RankLite;
  to: RankLite;
  promoted: boolean;
  unlocked: { id: string; emoji: string; name: string; text: string; tier: number; rarity: { name: string; color: string } }[];
  dailyDone: boolean;
};

// What this quiz earned: XP, LP, a promotion banner and the achievement tiers it unlocked.
export function RewardsCard({ reward, fresh }: { reward: Reward; fresh: boolean }) {
  const reduce = useReducedMotion();
  const [shownXp, setShownXp] = useState(fresh ? 0 : reward.xpGain);
  const [reveal, setReveal] = useState(!fresh);

  useEffect(() => {
    if (!fresh) return;
    const t1 = setTimeout(() => setShownXp(reward.xpGain), reduce ? 0 : 500);
    const t2 = setTimeout(
      () => {
        setReveal(true);
        if (reward.promoted || reward.unlocked.length > 0) celebrate();
      },
      reduce ? 0 : 1500,
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fresh, reward.xpGain, reward.unlocked.length, reward.promoted, reduce]);

  const shown = reveal ? reward.to : reward.from;

  return (
    <div className="hx-panel anim-rise p-5">
      <div className="flex items-center gap-4">
        <RankEmblem tierIndex={shown.tierIndex} division={shown.division} size={92} />
        <div className="min-w-0 flex-1">
          <p className="hx-kicker">Recompensa</p>
          <p className="hx-title hx-gold-text text-4xl tabular-nums">
            +<AnimatedNumber from={fresh ? 0 : reward.xpGain} value={shownXp} /> <span className="text-xl">XP</span>
          </p>
          <p className="hx-mute text-sm">
            {shown.label} · {reward.to.toNext} XP para {reward.to.tierIndex >= 9 ? "seguir subiendo" : "el siguiente rango"}
          </p>
          <div className="hx-bar mt-1.5">
            <span style={{ width: `${Math.max(shown.pct, 3)}%` }} />
          </div>
        </div>
      </div>

      {reward.dailyDone && (
        <p className="mt-3 border-l-2 border-[var(--neon)] bg-[var(--neon)]/10 px-3 py-1.5 text-sm font-bold">☀️ ¡Meta diaria cumplida! Ya cuenta tu bonus de XP.</p>
      )}

      <AnimatePresence>
        {reveal && reward.promoted && (
          <motion.div
            key="promo"
            initial={reduce ? false : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
            className="hx-shine mt-4 border border-[var(--accent)] bg-gradient-to-r from-[var(--accent)]/25 via-[var(--hi)]/25 to-[var(--accent)]/25 p-3 text-center"
          >
            <p className="hx-kicker !text-[var(--hi)]">¡Ascenso!</p>
            <p className="hx-title hx-gold-text text-2xl">{reward.to.label}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {reveal && reward.unlocked.length > 0 && (
        <div className="mt-4">
          <p className="hx-kicker mb-2">{reward.unlocked.length === 1 ? "Logro desbloqueado" : "Logros desbloqueados"}</p>
          <ul className="space-y-2">
            {reward.unlocked.map((a, i) => (
              <motion.li
                key={a.id}
                initial={reduce ? false : { opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 18, delay: i * 0.15 }}
                className="flex items-center gap-3 bg-[var(--fg)]/5 p-3"
                style={{ borderLeft: `3px solid ${a.rarity.color}` }}
              >
                <span aria-hidden className="text-3xl">
                  {a.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold">
                    {a.name} <span style={{ color: a.rarity.color }}>· {a.rarity.name}</span>
                  </span>
                  <span className="hx-mute block text-sm">{a.text}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
