/** Only currently rendered chapters. Deferred screens belong to #386, not this registry. */
export const landingSections = [
  { key: "hero", id: "top", ko: "처음", en: "Welcome" },
  { key: "region", id: "regions", ko: "경남", en: "Gyeongnam" },
  { key: "needs", id: "story", ko: "필요한 편의", en: "Facilities" },
  { key: "recommendation", id: "recommendation", ko: "여행지", en: "Places" },
  { key: "departure", id: "departure", ko: "출발 전", en: "Before leaving" },
  { key: "community", id: "community", ko: "여행 이야기", en: "Community" },
  { key: "closing", id: "closing", ko: "여행 계획", en: "Plan a trip" },
] as const;
