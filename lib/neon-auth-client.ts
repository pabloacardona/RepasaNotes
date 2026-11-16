"use client";

import { createAuthClient } from "@neon/auth/next";

// Browser side of Neon Auth: it talks to /api/auth/[...path], which proxies to the Neon Auth server.
export const neonAuthClient = createAuthClient();
