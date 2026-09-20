const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);
const CLEAR_CODES = new Set([0, 1, 2]);
const SOURCE = "Open-Meteo 예보 · 관광정보 설명 기준";

export function sceneryCondition(day) {
  const code = day?.code;
  const rainProbability = day?.rainProbability;
  if (!Number.isInteger(code) || !Number.isFinite(rainProbability) || rainProbability < 0 || rainProbability > 100) return "other";
  if (RAIN_CODES.has(code) || rainProbability >= 50) return "rain";
  if (CLEAR_CODES.has(code)) return "clear";
  return "other";
}

export function sceneryHint(condition, setting) {
  if (condition === "rain" && setting === "outdoor") return { text: "이 날은 비 소식이 있어요. 바깥에서 보는 곳이에요.", source: SOURCE };
  if (condition === "rain" && setting === "indoor") return { text: "이 날은 비 소식이 있어요. 실내에서 볼 수 있는 곳이에요.", source: SOURCE };
  if (condition === "clear" && setting === "outdoor") return { text: "이 날은 맑음이에요. 바깥에서 보는 곳이에요.", source: SOURCE };
  return null;
}
