import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, users } from "@/lib/db";
import { verifyFirebaseToken } from "@/lib/firebase-verify";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

// Exchanges a Firebase ID token for the app's own session cookie. The account is matched by email, so players who
// signed up with a password before Firebase keep their data. Only verified emails are accepted: otherwise someone could
// register another person's address in Firebase and take over that person's account here.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const idToken = typeof body?.idToken === "string" ? body.idToken : "";
  const identity = idToken ? await verifyFirebaseToken(idToken) : null;
  if (!identity) return NextResponse.json({ error: "No se pudo verificar tu sesión de Firebase" }, { status: 401 });
  if (!identity.emailVerified) {
    return NextResponse.json({ error: "Verifica tu correo: te enviamos un enlace. Luego inicia sesión de nuevo." }, { status: 403 });
  }

  const db = getDb();
  const [found] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.email, identity.email));
  let user = found;
  if (!user) {
    const name = (typeof body?.name === "string" && body.name.trim()) || identity.name || identity.email.split("@")[0];
    // Firebase owns the credentials; the local hash is random and never used to sign in.
    const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
    [user] = await db
      .insert(users)
      .values({ name: name.slice(0, 80), email: identity.email, passwordHash })
      .returning({ id: users.id, name: users.name, email: users.email });
  }

  const token = await signSession({ sub: user.id, name: user.name, email: user.email });
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
