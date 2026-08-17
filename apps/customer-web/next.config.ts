import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@freshly/shared-types"],
};

export default nextConfig;
