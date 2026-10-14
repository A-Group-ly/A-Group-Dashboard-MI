import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tailwind 4 through Turbopack's loader (unchanged).
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
