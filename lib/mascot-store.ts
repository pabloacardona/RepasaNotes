import "server-only";
import { eq } from "drizzle-orm";
import { getDb, users } from "./db";
import { MASCOTS, type MascotId } from "./mascot-data";

export const isMascotId = (v: unknown): v is MascotId => MASCOTS.some((m) => m.id === v);

export type SavedMascots = { main: MascotId | null; baby: MascotId | null };

// The monsters a player chose to keep. Null means "surprise me". Reads never throw, so a database that has not
// got a column yet (before the next db:push) just behaves like "no saved choice".
export async function getUserMascots(userId: string): Promise<SavedMascots> {
  const db = getDb();
  try {
    const [row] = await db.select({ mascot: users.mascot, baby: users.mascotBaby }).from(users).where(eq(users.id, userId)).limit(1);
    return { main: isMascotId(row?.mascot) ? row.mascot : null, baby: isMascotId(row?.baby) ? row.baby : null };
  } catch {
    try {
      const [row] = await db.select({ mascot: users.mascot }).from(users).where(eq(users.id, userId)).limit(1);
      return { main: isMascotId(row?.mascot) ? row.mascot : null, baby: null };
    } catch {
      return { main: null, baby: null };
    }
  }
}

export async function setUserMascot(userId: string, mascot: MascotId | null, slot: "main" | "baby" = "main") {
  await getDb().update(users).set(slot === "baby" ? { mascotBaby: mascot } : { mascot }).where(eq(users.id, userId));
}
