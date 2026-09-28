"use client";

import { useEffect, useState } from "react";
import type { TravelBookInput, TravelBook } from "../../lib/travel-book.js";
import { resolveFacilityKeys, facilityLabel } from "../../lib/facility-selection.js";
import { providerFailureMessage } from "../../lib/provider-failure.js";

type DemoTrip = {
  id: string; title: string; region: string; theme: string; note: string;
  profileKeys: string[]; placeIds: string[]; dayOffsets: number[]; visitMinutes: number[]; breakMinutes: number[];
};
class OfficialProviderError extends Error {}

function validTrip(value: unknown): value is DemoTrip {
  if (!value || typeof value !== "object") return false;
  const trip = value as Partial<DemoTrip>;
  return typeof trip.id === "string" && typeof trip.title === "string" && typeof trip.region === "string"
    && typeof trip.theme === "string" && typeof trip.note === "string"
    && Array.isArray(trip.profileKeys) && trip.profileKeys.length <= 6
    && resolveFacilityKeys({ facilityKeys: trip.profileKeys }).length === trip.profileKeys.length
    && Array.isArray(trip.placeIds) && trip.placeIds.length > 0 && trip.placeIds.length <= 12
    && trip.placeIds.every(id => typeof id === "string" && /^[1-9]\d{0,11}$/.test(id))
    && new Set(trip.placeIds).size === trip.placeIds.length
    && Array.isArray(trip.dayOffsets) && Array.isArray(trip.visitMinutes) && Array.isArray(trip.breakMinutes)
    && [trip.dayOffsets, trip.visitMinutes, trip.breakMinutes].every(items => items.length === trip.placeIds?.length)
    && trip.dayOffsets.every(day => Number.isInteger(day) && day >= 0 && day <= 2)
    && trip.visitMinutes.every(minutes => Number.isInteger(minutes) && minutes >= 15 && minutes <= 240)
    && trip.breakMinutes.every(minutes => Number.isInteger(minutes) && minutes >= 0 && minutes <= 120);
}

function localDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function JudgeDemoTrips({ onImport }: { onImport: (input: TravelBookInput) => TravelBook | null }) {
  const [trips, setTrips] = useState<DemoTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/judge-demo-trips", { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => setTrips(Array.isArray(data.trips) ? data.trips.filter(validTrip) : []))
      .catch(() => { if (!controller.signal.aborted) setNotice("시연 일정을 불러오지 못했습니다. 잠시 후 다시 열어 주세요."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  async function importTrip(trip: DemoTrip) {
    setBusyId(trip.id); setNotice("");
    try {
      const params = new URLSearchParams({ action: "places", ids: trip.placeIds.join(","), profiles: trip.profileKeys.join(",") });
      const response = await fetch(`/api/wave?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw data?.failure ? new OfficialProviderError(providerFailureMessage(data.failure)) : new Error("official-data");
      if (!Array.isArray(data.places) || !Array.isArray(data.missing) || data.missing.length
        || data.places.length !== trip.placeIds.length) throw data?.failure ? new OfficialProviderError(providerFailureMessage(data.failure)) : new Error("official-data");
      const byId = new Map<string, Record<string, unknown>>(data.places.map((place: Record<string, unknown>) => [String(place.id), place]));
      const places = trip.placeIds.map(id => byId.get(id));
      if (places.some(place => !place || typeof place.name !== "string" || !place.name || typeof place.city !== "string" || place.city !== trip.region)) throw new Error("official-data");
      const start = localDate(7);
      const input: TravelBookInput = {
        title: trip.title, region: trip.region, theme: trip.theme, profiles: trip.profileKeys, status: "planned", note: trip.note,
        travelStart: start, travelEnd: localDate(7 + Math.max(...trip.dayOffsets)), dayStartTime: "10:00",
        places: places.map(place => ({ id: String(place!.id), name: String(place!.name), city: String(place!.city),
          address: typeof place!.address === "string" ? place!.address : "",
          image: typeof place!.image === "string" ? place!.image : "",
          contentTypeId: typeof place!.contentTypeId === "string" ? place!.contentTypeId : "",
          source: typeof place!.source === "string" ? place!.source : "" })),
        scheduleAssignments: Object.fromEntries(trip.placeIds.map((id, i) => [id, localDate(7 + trip.dayOffsets[i])])),
        visitMinutesByPlaceId: Object.fromEntries(trip.placeIds.map((id, i) => [id, trip.visitMinutes[i]])),
        breakMinutesByPlaceId: Object.fromEntries(trip.placeIds.map((id, i) => [id, trip.breakMinutes[i]])),
      };
      if (!onImport(input)) throw new Error("storage");
      setNotice(`${trip.title} 일정을 이 기기의 여행집에 담았습니다. 아래에서 메모·상태·비교·일정 복원을 시험할 수 있습니다.`);
    } catch (error) {
      setNotice(error instanceof Error && error.message === "storage"
        ? "이 기기에 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요."
        : error instanceof OfficialProviderError
          ? `${error.message} 공식 장소를 모두 확인할 때까지 일정 사본은 담지 않습니다.`
          : "공식 장소 정보를 모두 확인하지 못해 일정을 담지 않았습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setBusyId(""); }
  }

  return <section className="travel-book-demo" aria-labelledby="travel-book-demo-title">
    <h2 id="travel-book-demo-title">바로 시험할 시연 일정</h2>
    <p>운영 DB에 준비한 여행 계획입니다. 장소 정보는 담을 때 공식 API에서 다시 확인하고, 내 여행에 담은 사본만 이 기기에서 편집합니다. 방문·시설 확인 완료를 뜻하지 않습니다.</p>
    {loading && <p role="status">시연 일정을 불러오는 중입니다.</p>}
    {!loading && trips.length > 0 && <div className="travel-book-demo-list">{trips.map(trip => <article key={trip.id}>
      <span>{trip.region} · {trip.placeIds.length}곳 · {Math.max(...trip.dayOffsets) + 1}일</span>
      <h3>{trip.title}</h3><p>{trip.note}</p>
      <small>선택한 편의 조건: {trip.profileKeys.map(key => facilityLabel(key)).join(" · ") || "없음"} · 현장 확인 전</small>
      <button type="button" disabled={Boolean(busyId)} onClick={() => void importTrip(trip)}>{busyId === trip.id ? "공식 장소 확인 중…" : "내 여행에 사본 담기"}</button>
    </article>)}</div>}
    {!loading && !trips.length && !notice && <p>현재 준비된 시연 일정이 없습니다.</p>}
    <p role="status" aria-live="polite">{notice}</p>
  </section>;
}
