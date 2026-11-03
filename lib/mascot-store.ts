import "server-only";
import { eq } from "drizzle-orm";
import { getDb, users } from "./db";
import { MASCOTS, type MascotId } from "./mascot-data";

export const isMascotId = (v: unknown): v is MascotId => MASCOTS.some((m) => m.id === v);

// The monster a player chose to keep. Null means "surprise me". Reads never throw, so a database that has not
// got the column yet (before `npm run db:push`) just behaves like "no saved choice".
export async function getUserMascot(userId: string): Promise<MascotId | null> {
  try {
    const [row] = await getDb().select({ mascot: users.mascot }).from(users).where(eq(users.id, userId)).limit(1);
    return isMascotId(row?.mascot) ? row.mascot : null;
  } catch {
    return null;
  }
}

export async function setUserMascot(userId: string, mascot: MascotId | null) {
  await getDb().update(users).set({ mascot }).where(eq(users.id, userId));
}
