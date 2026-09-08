import type { RouteAlternative } from "../routing/types";
import { hasJourneyEstimate } from "../../lib/route-estimates.js";

/** Store both messages so changing language never repeats a route request. */
export type RouteNotice = { ko: string; en: string; subject?: string };

export function routeResultNotice(alternatives: RouteAlternative[]): RouteNotice {
  const count = alternatives.filter(hasJourneyEstimate).length;
  return count ? {
    ko: `예상 시간이 확인된 경로 ${count}개를 비교합니다. 경로 정보는 휠체어 통행 가능 여부를 보장하지 않습니다.`,
    en: `Compare ${count} route${count === 1 ? "" : "s"} with estimated journey times. Route information does not confirm wheelchair access.`,
  } : {
    ko: "확인된 이동 시간이 없습니다. 직선 연결은 실제 이동 경로가 아닙니다. 카카오맵에서 경로를 확인해 주세요.",
    en: "No verified journey time. A straight connection is not a travel route. Check your route in Kakao Maps.",
  };
}

export function routeTitle(route: RouteAlternative, english: boolean) {
  if (!english) return route.label;
  if (route.id === "kakao-car" && route.label === "카카오 자동차 추천") return "Kakao recommended driving route";
  if (/^odsay-\d+$/.test(route.id) && /^대중교통 (추천|\d+안)$/.test(route.label)) return `Public transport option ${route.id.slice(6)}`;
  return route.label;
}
