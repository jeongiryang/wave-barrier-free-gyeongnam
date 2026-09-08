import type { RouteAlternative } from "../routing/types";
import { hasJourneyEstimate } from "../../lib/route-estimates.js";

/** Store both messages so changing language never repeats a route request. */
export type RouteNotice = { ko: string; en: string; subject?: string };

/** Translate app-authored provider outcomes without another route request. */
export function transitDetail(detail: string, english: boolean) {
  if (!english) return detail;
  const messages = [
    ["승하차 정류장의 위치가 빠져", "Stop coordinates are missing. Check the complete journey in an external map."],
    ["승하차 정류장의 위치가 지원 좌표 범위를 벗어나", "Stop coordinates are outside the supported area. Check your journey in an external map."],
    ["요청한 출발·도착 장소와 정류장의 연결을", "The stops could not be linked to your requested departure and destination. Check the connecting journeys in an external map."],
    ["도보·환승 구간의 연결이", "Walking or transfer connections could not be verified. Check the complete journey in an external map."],
    ["경로의 필수 정보가 불완전해", "Required route information is incomplete. Check your journey in an external map."],
    ["터미널 앞뒤 이동을 포함한", "Connections before and after the terminals are unverified. Check the complete journey in an external map."],
    ["이 구간에서 제공되는 대중교통 경로가 없습니다.", "No public transport route is available for this leg. Change your departure or destination, or check an external map."],
  ];
  return messages.find(([prefix]) => detail.startsWith(prefix))?.[1]
    || "Public transport information could not be checked. Try again later or check an external map.";
}

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
