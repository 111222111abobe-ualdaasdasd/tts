import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone-сборка нужна только для Docker/VPS (Timeweb).
  // Netlify должен собирать обычным образом через свой плагин, поэтому
  // включаем standalone только при явном флаге.
  ...(process.env.BUILD_STANDALONE === "true"
    ? { output: "standalone" }
    : {}),
};

export default nextConfig;
