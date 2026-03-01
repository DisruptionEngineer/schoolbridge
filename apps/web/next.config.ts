import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Skip type checking during build — Supabase types not yet generated
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@schoolbridge/shared",
    "@schoolbridge/db",
    "@schoolbridge/connectors",
    "@schoolbridge/jobs",
    "@schoolbridge/ui",
  ],
  serverExternalPackages: [
    "discord.js",
    "@discordjs/ws",
    "@discordjs/rest",
    "tsdav",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // discord.js optional native dependencies
      config.externals.push({
        "zlib-sync": "commonjs zlib-sync",
        bufferutil: "commonjs bufferutil",
        "utf-8-validate": "commonjs utf-8-validate",
        "@discordjs/opus": "commonjs @discordjs/opus",
        "libsodium-wrappers": "commonjs libsodium-wrappers",
      });
    }
    return config;
  },
};

export default nextConfig;
