import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, allowedDevOrigins: ["192.168.1.31"],
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
