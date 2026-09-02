import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "W.A.V.E 경남 무장애 여행 길잡이",
    short_name: "W.A.V.E",
    description: "경남 18개 시·군의 관광·무장애·교통 근거로 여행을 준비하는 길잡이",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4fbff",
    theme_color: "#062736",
    lang: "ko-KR",
    categories: ["travel", "navigation", "lifestyle"],
    icons: [
      { src: "/app-icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/app-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      { src: "/maskable-icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "maskable" },
      { src: "/maskable-icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
