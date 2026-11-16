import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { neonAuth } from "@/lib/neon-auth-server";

const PRIVATE = ["/dashboard", "/apuntes", "/quizzes", "/quiz"];

// Neon Auth's middleware only runs on the Google return URL: it trades the one-time OAuth verifier in the URL for a
// Neon Auth session, then redirects to the same URL without it. /auth/google (the route handler) takes it from there.
const googleReturn = neonAuth.middleware({ loginUrl: "/login", publicRoutes: ["/auth/google"] });

// Optimistic check only: pages and API routes verify the session again.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/auth/google") return googleReturn(req);

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  const isPrivate = PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPrivate && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/apuntes/:path*", "/quizzes/:path*", "/quiz/:path*", "/login", "/auth/google"],
};
