import type { MetadataRoute } from "next";

const origin = "https://wave-barrier-free-gyeongnam.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/planner`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${origin}/community`, changeFrequency: "daily", priority: 0.8 },
    { url: `${origin}/login`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${origin}/register`, changeFrequency: "monthly", priority: 0.4 },
  ];
}
