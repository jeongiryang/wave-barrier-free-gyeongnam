import { providerFailureMessage, type ProviderFailure } from "../../lib/provider-failure.js";

/** Translate app-authored provider outcomes without another route request. */
export function transitDetail(detail: string, english: boolean, failure?: Pick<ProviderFailure, "kind">) {
  if (failure) return providerFailureMessage(failure, english);
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

