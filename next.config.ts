import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LanceDB uses native bindings that can't be bundled by Turbopack
  // These packages will be loaded at runtime from node_modules
  serverExternalPackages: ["@lancedb/lancedb"],
};

export default nextConfig;
