import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@schoolbridge/shared",
    "@schoolbridge/db",
    "@schoolbridge/connectors",
    "@schoolbridge/jobs",
    "@schoolbridge/ui",
  ],
};

export default nextConfig;
