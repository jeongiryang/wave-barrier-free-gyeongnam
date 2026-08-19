import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "W.A.V.E 여행 동행 안전 플랫폼",
    short_name: "W.A.V.E",
    description: "경남 18개 시·군의 데이터 기반 무장애 맞춤 여행 길잡이",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4fbff",
    theme_color: "#062736",
    lang: "ko-KR",
    categories: ["travel", "navigation", "lifestyle"],
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
