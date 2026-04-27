import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

/**
 * Next/Turbopack otherwise picks a parent lockfile (e.g. ~/package-lock.json) and resolves
 * packages like `tailwindcss` from the wrong folder — "Can't resolve 'tailwindcss' in .../chatbot".
 * Pin the app root to this directory (where node_modules lives).
 */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: appRoot,
  },
  // Prevent Turbopack from bundling pdf-parse/pdfjs-dist so they load from
  // node_modules at runtime — this lets pdfjs find its own worker via a
  // normal relative import instead of a broken .next/chunks path.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
