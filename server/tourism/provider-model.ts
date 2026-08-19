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
    merged.set(id, { ...(merged.get(id) || {}), ...item });
  });
  return [...merged.values()];
}
