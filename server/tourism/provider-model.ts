import { clean } from "../shared/http";
import type { ProviderAttempt as Attempt, ProviderItem as KtoItem } from "../shared/provider-data";

export function apiStatus(id: string, name: string, role: string, result: Attempt, count?: number) {
  const found = count ?? (result.ok ? result.value.items.length : 0);
  return {
    id, name, role,
    state: result.ok ? (found ? "live" : "empty") : "error",
    count: found,
    note: result.ok ? (found ? "실시간 응답 반영" : "조건에 맞는 결과 없음") : result.error,
  };
}

export function mergePlaces(primary: KtoItem[], secondary: KtoItem[]) {
  const merged = new Map<string, KtoItem>();
  secondary.forEach((item) => merged.set(clean(item.contentid || item.title), item));
  primary.forEach((item) => {
    const id = clean(item.contentid || item.title);
    // 무장애 목록은 동일 contentId의 관광 목록보다 편의 필드는 풍부하지만
    // 이미지·주소가 빈 문자열인 경우가 있다. 빈 값으로 이미 확인된 관광정보를
    // 덮어쓰지 않아 추천 카드가 불필요하게 사진 재검색으로 떨어지지 않게 한다.
    const meaningfulPrimary = Object.fromEntries(
      Object.entries(item).filter(([, value]) => clean(value) !== ""),
    );
    merged.set(id, { ...(merged.get(id) || {}), ...meaningfulPrimary });
  });
  return [...merged.values()];
}
