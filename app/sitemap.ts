import type { MetadataRoute } from "next";

const origin = "https://wave-barrier-free-gyeongnam.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/planner`, changeFrequency: "weekly", priority: 0.9 },
  ];
}
