import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
