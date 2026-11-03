"use client";

import Link from "next/link";
import { RankEmblem } from "./rank-emblem";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { CONQUER_TIER, TIERS, TOPIC_MIN, type Mastery } from "@/lib/ranks";

type Topic = { topic: string; answered: number; correct: number; mastery: Mastery };

// One card per topic. Hover a card for how its mastery is made up and what is left to conquer it.
export function ConquestMap({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) {
    return (
      <div className="hx-panel mt-3 p-8 text-center">
        <p className="hx-title text-xl">Territorio sin explorar</p>
        <p className="hx-mute mt-2">Resuelve quizzes de un tema para empezar a conquistarlo.</p>
        <Link href="/quizzes/nuevo" className="hx-btn hx-btn-gold mt-5">
          Nuevo quiz
        </Link>
      </div>
    );
  }
  const conquerAt = TOPIC_MIN[CONQUER_TIER];
  return (
    <Stagger className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((t) => {
        const m = t.mastery;
        const acc = t.answered ? Math.round((t.correct / t.answered) * 100) : 0;
        const nextMin = TOPIC_MIN[m.tierIndex + 1];
        const toNext = nextMin === undefined ? 0 : Math.max(0, Math.ceil((nextMin - m.points) * 10) / 10);
        const toConquer = Math.max(0, Math.ceil((conquerAt - m.points) * 10) / 10);
        return (
          <StaggerItem key={t.topic} className="group relative hover:z-30">
            <div className="hx-panel hx-lift h-full p-4" tabIndex={0}>
              <div className="flex items-center gap-3">
                <RankEmblem tierIndex={m.tierIndex} size={64} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{t.topic}</p>
                  <p className="font-display text-sm font-bold uppercase tracking-wider" style={{ color: m.tier.glow }}>
                    {m.tier.name}
                  </p>
                  <p className="hx-mute text-xs">
                    {t.correct}/{t.answered} aciertos
                  </p>
                </div>
              </div>
              <div className="hx-bar mt-3">
                <span style={{ width: `${Math.max(m.pct, 3)}%` }} />
              </div>
              <p className="mt-1.5 flex items-center justify-between text-xs">
                <span className="hx-mute">{m.nextName ? `Siguiente: ${m.nextName}` : "Dominio total"}</span>
                {m.conquered ? <span className="font-bold text-[var(--ok)]">🏰 Conquistado</span> : <span className="hx-mute">{m.pct}%</span>}
              </p>
            </div>

            <div role="tooltip" className="map-tip pointer-events-none absolute bottom-full left-0 right-0 z-30 mb-2 rounded-xl p-3 text-sm">
              <p className="font-bold">{t.topic}</p>
              <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                <Info k="Dominio" v={`${m.points}`} />
                <Info k="Precisión" v={`${acc}%`} />
                <Info k="Respondidas" v={`${t.answered}`} />
              </dl>
              <ul className="mt-2 space-y-1 text-xs">
                {m.nextName && (
                  <li>
                    ⬆️ Te faltan <b>{toNext}</b> puntos para <b style={{ color: TIERS[m.tierIndex + 1].glow }}>{m.nextName}</b>
                  </li>
                )}
                {m.conquered ? (
                  <li className="font-semibold text-[var(--ok)]">🏰 Territorio conquistado (desde {TIERS[CONQUER_TIER].name})</li>
                ) : (
                  <li>
                    🏰 Se conquista en <b>{TIERS[CONQUER_TIER].name}</b>: faltan <b>{toConquer}</b> puntos
                  </li>
                )}
                <li className="hx-mute">Cada acierto suma puntos según tu precisión: adivinar no sube.</li>
              </ul>
            </div>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-[var(--track)] px-1 py-1.5">
      <dd className="font-display text-base font-bold tabular-nums">{v}</dd>
      <dt className="hx-mute text-[0.6rem] font-bold uppercase tracking-wider">{k}</dt>
    </div>
  );
}
