import type { MetadataRoute } from "next";

const BASE = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/login"], disallow: ["/api/", "/dashboard", "/apuntes", "/quizzes", "/quiz"] },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
