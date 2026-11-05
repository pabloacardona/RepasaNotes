import "server-only";
import { eq } from "drizzle-orm";
import { getDb, users } from "./db";

export const AVATAR_MAX_CHARS = 90_000; // a 256px JPEG is ~15-30 KB; this leaves room and still stops abuse

// Reads never throw: before `npm run db:push` adds the column, everyone just has no photo.
export async function getUserAvatar(userId: string): Promise<string | null> {
  try {
    const [row] = await getDb().select({ avatar: users.avatar }).from(users).where(eq(users.id, userId)).limit(1);
    return row?.avatar ?? null;
  } catch {
    return null;
  }
}

export async function setUserAvatar(userId: string, avatar: string | null) {
  await getDb().update(users).set({ avatar }).where(eq(users.id, userId));
}
