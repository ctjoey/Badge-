import type { NextConfig } from "next";

// Static export: the whole app is client-side, so `next build` emits plain files to `out/`.
// Those files are served by any static host and are bundled into the iOS app by Capacitor.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
