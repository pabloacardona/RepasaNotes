import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

let cached: DB | undefined;

// Lazy init so `next build` works without DATABASE_URL.
export function getDb(): DB {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL no está configurada");
    cached = drizzle(neon(url), { schema });
  }
  return cached;
}

export * from "./schema";
