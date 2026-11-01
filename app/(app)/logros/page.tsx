import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getGameProfile } from "@/lib/game";
import { AchievementsView } from "@/components/game/achievements-view";

export const metadata: Metadata = { title: "Logros" };

export default async function AchievementsPage() {
  const user = await requireUser();
  return <AchievementsView profile={await getGameProfile(user.sub)} />;
}
