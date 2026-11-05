import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Verifies a Firebase ID token without the Admin SDK: signature against Google's public keys, issuer, audience and expiry.
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export type FirebaseIdentity = { uid: string; email: string; emailVerified: boolean; name: string | null; picture: string | null };

export async function verifyFirebaseToken(idToken: string): Promise<FirebaseIdentity | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    });
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      uid: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: typeof payload.name === "string" ? payload.name : null,
      picture: typeof payload.picture === "string" ? payload.picture : null,
    };
  } catch {
    return null;
  }
}
