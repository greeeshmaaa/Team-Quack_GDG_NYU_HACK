import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    useWasmBinary: true,
  },
};

export default nextConfig;
