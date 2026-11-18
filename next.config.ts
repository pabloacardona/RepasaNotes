import type { NextConfig } from "next";

// Conservative response headers: they harden the app without restricting anything it does today.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

// Models, textures and icons are not content-hashed, so cache them for a week and revalidate in the background.
const staticAssetCache = { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" };

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@react-three/drei", "three", "motion"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/3d/:path*", headers: [staticAssetCache] },
      { source: "/icons/:path*", headers: [staticAssetCache] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
