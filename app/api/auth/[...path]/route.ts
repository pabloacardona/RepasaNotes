import { neonAuth } from "@/lib/neon-auth-server";

// Proxy to Neon Auth (Google sign-in, session checks). The app's own routes (/api/auth/login, /register, /logout,
// /firebase) are static segments, so they keep winning over this catch-all.
export const { GET, POST, PUT, DELETE, PATCH } = neonAuth.handler();
