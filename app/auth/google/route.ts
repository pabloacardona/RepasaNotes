import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, users } from "@/lib/db";
import { neonAuth } from "@/lib/neon-auth-server";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// Where Google sends the player back to. proxy.ts has already traded the OAuth verifier for a Neon Auth session
// (see the neon middleware there), so here we only read that session, find or create the player and hand out the app cookie.
// The account is matched by email, so players who signed up with a password keep their data. Only emails that Google
// vouches for are accepted: otherwise someone could take over another person's account with an unverified address.
export async function GET(req: NextRequest) {
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, req.url));

  const { data } = await neonAuth.getSession().catch(() => ({ data: null }));
  const identity = data?.user;
  if (!identity?.email) return fail("google");
  if (identity.emailVerified === false) return fail("unverified");

  const email = identity.email.trim().toLowerCase();
  const db = getDb();
  const [found] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.email, email));
  let user = found;
  if (!user) {
    const name = (identity.name?.trim() || email.split("@")[0]).slice(0, 80);
    // Google owns the credentials; the local hash is random and never used to sign in.
    const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
    [user] = await db.insert(users).values({ name, email, passwordHash }).returning({ id: users.id, name: users.name, email: users.email });
  }

  const token = await signSession({ sub: user.id, name: user.name, email: user.email });
  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
