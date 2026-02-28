import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@comtammatu/database",
    "@comtammatu/shared",
    "@comtammatu/security",
    "@comtammatu/ui",
  ],
};

export default nextConfig;
