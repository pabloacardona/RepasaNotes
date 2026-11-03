import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, users } from "@/lib/db";
import { loginSchema, fieldErrors } from "@/lib/validators";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: fieldErrors(parsed.error) }, { status: 400 });
  }
  const { email, password } = parsed.data;

  // Explicit columns: login must keep working even on a database that has not got newer columns yet.
  const [user] = await getDb()
    .select({ id: users.id, name: users.name, email: users.email, passwordHash: users.passwordHash })
    .from(users).where(eq(users.email, email));
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) {
    return NextResponse.json(
      { errors: { form: "Correo o contraseña incorrectos" } },
      { status: 401 },
    );
  }

  const token = await signSession({ sub: user.id, name: user.name, email: user.email });
  const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
