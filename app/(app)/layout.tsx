import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/auth";
import { getGameProfile } from "@/lib/game";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const game = await getGameProfile(user.sub).catch(() => null);
  return (
    <>
      <AppNav
        name={user.name}
        game={game && { level: game.level.level, title: game.level.title, pct: game.level.pct, streak: game.streak.current, activeToday: game.streak.activeToday }}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
