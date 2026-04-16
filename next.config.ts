import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Force @stellar/stellar-sdk to use the Node.js build which includes Horizon.Server
    // This is needed because the SDK's browser build excludes Horizon API
    config.resolve.alias = {
      ...config.resolve.alias,
      "@stellar/stellar-sdk": isServer
        ? require.resolve("@stellar/stellar-sdk")
        : require.resolve("@stellar/stellar-sdk"),
    };

    // Force the correct export condition for the SDK
    config.resolve.conditionNames = isServer
      ? ["node", "require", "module", "default"]
      : ["browser", "module", "require", "default"];

    return config;
  },
};

export default nextConfig;
