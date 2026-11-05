import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/auth";
import { getGameProfile } from "@/lib/game";
import { getStudyStats } from "@/lib/stats";
import { DAILY_GOAL } from "@/lib/gamification";
import { MascotSync } from "@/components/world/mascot-sync";
import { getUserMascots } from "@/lib/mascot-store";
import { getUserAvatar } from "@/lib/avatar-store";
import { ClickBurst } from "@/components/click-burst";
import { StatsDock } from "@/components/game/stats-dock";
import type { HudData } from "@/components/game/hud-utils";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const [game, stats, mascot, avatar] = await Promise.all([
    getGameProfile(user.sub).catch(() => null),
    getStudyStats(user.sub).catch(() => null),
    getUserMascots(user.sub),
    getUserAvatar(user.sub),
  ]);
  const hud: HudData | null = game && {
    rank: {
      tierIndex: game.rank.tierIndex,
      division: game.rank.division,
      label: game.rank.label,
      pct: game.rank.pct,
      toNext: game.rank.toNext,
      nextLabel: game.rank.nextLabel,
      xp: game.rank.xp,
      color: game.rank.tier.glow,
    },
    streak: game.streak,
    today: { answered: game.today.answered, goal: DAILY_GOAL },
    week: game.week,
    stats: { accuracy: stats?.accuracy ?? null, answered: stats?.total.answered ?? 0, quizzes: stats?.total.quizzes ?? 0 },
  };
  return (
    <>
      <ClickBurst />
      <MascotSync saved={mascot} />
      <AppNav name={user.name} avatar={avatar} game={hud} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 pb-24 sm:px-6">{children}</main>
      {hud && <StatsDock {...hud} />}
    </>
  );
}
