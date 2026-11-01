"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { celebrate } from "@/components/confetti";
import { RankEmblem } from "./rank-emblem";
import { AchievementIcon } from "./achievement-icon";
import { TIERS } from "@/lib/ranks";

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
  const [up, setUp] = useState(false);

  useEffect(() => {
    if (!fresh) return;
    const t1 = setTimeout(() => setShownXp(reward.xpGain), reduce ? 0 : 500);
    const t2 = setTimeout(
      () => {
        setReveal(true);
        if (reward.promoted) setUp(true);
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

  const tier = TIERS[reward.to.tierIndex];

  return (
    <div className="hx-panel anim-rise p-5">
      <AnimatePresence>
        {up && (
          <motion.div
            key="rankup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] grid place-items-center overflow-hidden bg-black/85 p-4"
            onClick={() => setUp(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Subiste de rango"
            style={{ ["--c" as string]: tier.color, ["--g" as string]: tier.glow }}
          >
            <span aria-hidden className="rank-rays !inset-[-60%]" style={{ opacity: 0.9 }} />
            <motion.div
              initial={{ scale: 0.2, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 12 }}
              className="relative text-center"
            >
              <p className="hx-blink font-display font-bold text-xs text-[var(--accent)]">¡SUBISTE DE RANGO!</p>
              <div className="mt-4 flex justify-center">
                <RankEmblem tierIndex={reward.to.tierIndex} division={reward.to.division} size={260} />
              </div>
              <p className="hx-title mt-4 text-6xl" style={{ color: tier.glow }}>
                {reward.to.label}
              </p>
              <p className="mt-2 text-xl text-white/80">Venías de {reward.from.label}. ¡Sigue así!</p>
              <button type="button" className="hx-btn hx-btn-gold mt-6" onClick={() => setUp(false)}>
                Continuar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
            <span style={{ width: `${Math.max(shown.pct, 3)}%`, transition: "width 1.4s cubic-bezier(.16,1,.3,1)" }} />
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
            className="hx-shine mt-4 border border-[var(--accent)] bg-[var(--accent)] !text-[var(--on-accent)] p-3 text-center"
          >
            <p className="hx-kicker !text-[var(--on-accent)]">¡Ascenso!</p>
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
                <AchievementIcon id={a.id} color={a.rarity.color} tier={a.tier} size={46} />
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
