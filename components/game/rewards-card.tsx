"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { celebrate } from "@/components/confetti";
import { LevelRing } from "./level-ring";

export type Reward = {
  xpGain: number;
  fromLevel: { level: number; pct: number; title: string };
  toLevel: { level: number; pct: number; title: string; into: number; need: number };
  newBadges: { id: string; emoji: string; name: string; desc: string }[];
  dailyDone: boolean;
};

// What this quiz earned: XP, level progress, level-up and new badges. Animated only right after finishing.
export function RewardsCard({ reward, fresh }: { reward: Reward; fresh: boolean }) {
  const reduce = useReducedMotion();
  const leveledUp = reward.toLevel.level > reward.fromLevel.level;
  const [shownXp, setShownXp] = useState(fresh ? 0 : reward.xpGain);
  const [reveal, setReveal] = useState(!fresh);

  useEffect(() => {
    if (!fresh) return;
    const t1 = setTimeout(() => setShownXp(reward.xpGain), reduce ? 0 : 500);
    const t2 = setTimeout(() => {
      setReveal(true);
      if (leveledUp || reward.newBadges.length > 0) celebrate();
    }, reduce ? 0 : 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fresh, reward.xpGain, reward.newBadges.length, leveledUp, reduce]);

  return (
    <Card className="anim-rise overflow-hidden border-0 bg-gradient-to-br from-[#1b2150] via-[#2a2a7a] to-[#4a2a8a] p-5 text-white shadow-xl">
      <div className="flex items-center gap-4">
        <LevelRing level={reveal ? reward.toLevel.level : reward.fromLevel.level} pct={reveal ? reward.toLevel.pct : reward.fromLevel.pct} from={fresh ? reward.fromLevel.pct : undefined} size={88} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-yellow">Recompensa</p>
          <p className="font-display text-4xl font-extrabold tabular-nums">
            +<AnimatedNumber from={fresh ? 0 : reward.xpGain} value={shownXp} /> <span className="text-xl text-yellow">XP</span>
          </p>
          <p className="text-sm text-white/80">
            {reveal ? reward.toLevel.title : reward.fromLevel.title} · {reward.toLevel.need - reward.toLevel.into} XP para el siguiente nivel
          </p>
        </div>
      </div>

      {reward.dailyDone && (
        <p className="mt-3 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold">☀️ ¡Meta diaria cumplida! Ya cuenta tu bonus de XP.</p>
      )}

      <AnimatePresence>
        {reveal && leveledUp && (
          <motion.div
            key="lvl"
            initial={reduce ? false : { opacity: 0, scale: 0.7, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
            className="mt-4 rounded-2xl bg-gradient-to-r from-yellow to-orange-400 p-4 text-center text-ink shadow-lg"
          >
            <p className="text-xs font-extrabold uppercase tracking-widest">¡Subiste de nivel!</p>
            <p className="font-display text-2xl font-extrabold">
              Nivel {reward.toLevel.level} · {reward.toLevel.title} 🎉
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {reveal && reward.newBadges.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-yellow">
            {reward.newBadges.length === 1 ? "Logro desbloqueado" : "Logros desbloqueados"}
          </p>
          <ul className="space-y-2">
            {reward.newBadges.map((b, i) => (
              <motion.li
                key={b.id}
                initial={reduce ? false : { opacity: 0, x: -30, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 240, damping: 18, delay: i * 0.15 }}
                className="flex items-center gap-3 rounded-xl bg-white/12 p-3"
              >
                <span aria-hidden className="text-3xl">{b.emoji}</span>
                <span>
                  <span className="block font-extrabold">{b.name}</span>
                  <span className="block text-sm text-white/75">{b.desc}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
