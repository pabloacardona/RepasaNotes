import "server-only";
import { createHash } from "node:crypto";
import { createNeonAuth } from "@neon/auth/next/server";

// Neon Auth handles the Google OAuth handshake. The app keeps its own session cookie (lib/session.ts) for everything
// else, so this instance is only used to prove "this person owns this Google account" and is then traded for that cookie.
//
// The cookie secret that Neon Auth signs its cache with is derived from JWT_SECRET, so there is nothing new to configure.
// NEON_AUTH_COOKIE_SECRET overrides it if you prefer a separate one.
function cookieSecret() {
  const explicit = process.env.NEON_AUTH_COOKIE_SECRET;
  if (explicit && explicit.length >= 32) return explicit;
  const base = process.env.JWT_SECRET;
  if (!base || base.length < 32) throw new Error("JWT_SECRET debe tener al menos 32 caracteres");
  return createHash("sha256").update(`neon-auth-cookie:${base}`).digest("hex");
}

export const googleAuthEnabled = Boolean(process.env.NEON_AUTH_BASE_URL);

export const neonAuth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL ?? "https://neon-auth-not-configured.invalid",
  cookies: {
    secret: cookieSecret(),
    // The return from Google is a cross-site navigation: Lax lets the challenge cookie come along, Strict would drop it.
    sameSite: "lax",
  },
});
