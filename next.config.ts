import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // konva/canvas 는 서버에서 번들하지 않음 (react-konva 는 클라이언트 전용)
  serverExternalPackages: ["konva", "canvas"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "fal.media" },
      { protocol: "https", hostname: "**.fal.media" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
