import type { MetadataRoute } from "next";

const origin = "https://wave-barrier-free-gyeongnam.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/planner`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${origin}/community`, changeFrequency: "daily", priority: 0.8 },
    { url: `${origin}/travel-book`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${origin}/photo-course`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${origin}/policies`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${origin}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
