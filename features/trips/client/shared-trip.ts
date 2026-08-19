import type { SharedTrip } from "../types";

export async function fetchSharedTrip(id: string, signal: AbortSignal) {
  const response = await fetch(`/api/trips/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" }, signal });
  const data = await response.json().catch(() => null) as (SharedTrip & { error?: string }) | null;
  if (!response.ok || !data) throw new Error(data?.error || "공유 여행 서버가 올바른 응답을 보내지 않았습니다.");
  return data;
}
