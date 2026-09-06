/** Translate our field names, never the provider's evidence or a visitor's words. */
const fieldNames: Record<string, string> = {
  parking: "Accessible parking", route: "Access path", wheelchair: "Wheelchair facilities",
  elevator: "Elevator", restroom: "Toilets", stroller: "Strollers", lactationroom: "Nursing room",
  babysparechair: "High chairs", braileblock: "Tactile paving", helpdog: "Guide dogs",
  guidehuman: "Assistance staff", audioguide: "Audio guidance", bigprint: "Large print",
  signguide: "Sign language guidance", videoguide: "Video guidance", hearingroom: "Hearing support rooms",
};

export function facilityName(key: string, original: string, english: boolean) {
  return english ? fieldNames[key] || original : original;
}

export function originalLanguage(value: string) {
  return /[가-힣]/.test(value) ? "ko" : undefined;
}
