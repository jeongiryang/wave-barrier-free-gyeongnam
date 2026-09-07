"use client";

import { useEffect, useRef, useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import type { Place } from "../types";
import { originalLanguage } from "../place-copy";
import { supportedPlacePoint } from "../../../lib/map-coordinates.js";

const messages = {
  available: ["공식 장소 위치를 확인했습니다.", "Official place location checked."],
  empty: ["공식 정보에서 이 장소를 찾지 못했습니다.", "This place was not found in the official information."],
  "coordinates-missing": ["공식 정보에 위치가 제공되지 않습니다.", "The official information has no coordinates."],
  "invalid-response": ["장소와 위치의 대응을 확인하지 못했습니다.", "The place and its location could not be verified."],
  "invalid-id": ["이 장소는 공식 관광정보로 위치를 다시 확인할 수 없습니다.", "This place cannot be rechecked through the official tourism information."],
  "provider-error": ["장소 정보를 불러오지 못했습니다. 다시 시도해 주세요.", "Place information could not be loaded. Please try again."],
} as const;
type Result = { id: string; name: string; status: keyof typeof messages };

export default function SavedPlaceCoordinateRecovery({ places, onRestore }: {
  places: Place[]; onRestore: (places: Place[]) => void;
}) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const request = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const missing = places.filter(place => !supportedPlacePoint(place.mapX, place.mapY));
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);

  async function restore() {
    if (busy || !missing.length) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setResults([]);
    const timer = window.setTimeout(() => controller.abort(), 20_000);
    const recovered: Place[] = [], outcomes: Result[] = [];
    try {
      // At most three public-ID lookups at once. No recommendation or GPS request.
      for (let index = 0; index < missing.length; index += 3) {
        await Promise.all(missing.slice(index, index + 3).map(async place => {
          let status: Result["status"] = "invalid-id";
          if (/^[1-9]\d{0,11}$/.test(place.id)) {
            status = "provider-error";
            try {
              const response = await fetch(`/api/wave?action=place-coordinates&contentId=${encodeURIComponent(place.id)}`, { signal: controller.signal });
              const data = await response.json();
              if (data?.id === place.id && Object.hasOwn(messages, data.status)) {
                status = data.status;
                if (status === "available") {
                  if (!response.ok || typeof data.mapX !== "string" || typeof data.mapY !== "string" || !supportedPlacePoint(data.mapX, data.mapY)) status = "invalid-response";
                  else recovered.push({ ...place, mapX: data.mapX, mapY: data.mapY });
                }
              } else if (response.ok) status = "invalid-response";
            } catch { /* Only bounded, translated states are shown to the user. */ }
          }
          outcomes.push({ id: place.id, name: place.name, status });
        }));
        if (controller.signal.aborted) break;
      }
      if (request.current !== controller) return;
      if (!controller.signal.aborted && recovered.length) onRestore(recovered);
      setResults(controller.signal.aborted ? missing.map(place => ({ id: place.id, name: place.name, status: "provider-error" })) : outcomes);
    } finally {
      window.clearTimeout(timer);
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  }
  // Keep the activated control mounted after success, preserving keyboard focus.
  if (!missing.length && !results.length) return null;
  return <section aria-label={en ? "Recheck saved place locations" : "저장 장소 위치 재확인"}>
    <p>{en ? "Recheck public place IDs with the Korea Tourism Organization to restore map locations. Your dates and order stay unchanged. This does not recheck facilities or route access." : "한국관광공사에 공개 장소 ID로 위치를 다시 조회합니다. 날짜와 순서는 유지하며, 편의시설이나 이동 경로의 접근성을 재확인하는 것은 아닙니다."}</p>
    <button className="primary-button" type="button" onClick={() => { void restore(); }} aria-busy={busy} aria-disabled={busy || !missing.length}>{busy ? (en ? "Checking place locations" : "장소 위치 확인 중") : (en ? "Recheck place locations" : "장소 위치 다시 확인")}</button>
    <div role="status" aria-live="polite"><ul>{results.map(result => <li key={result.id}><span lang={originalLanguage(result.name)}>{result.name}</span>: {messages[result.status][en ? 1 : 0]}</li>)}</ul></div>
    {missing.length > 0 && results.length > 0 && !busy && <p>{en ? "You can review your preferences and search the region again. Only matching saved places receive locations; your dates and order stay unchanged." : "여행 조건에서 같은 지역을 다시 검색할 수도 있어요. 저장한 장소와 일치하는 위치만 갱신하며 날짜와 순서는 유지합니다."} <a className="primary-button" href="#conditions">{en ? "Review trip preferences" : "여행 조건에서 다시 찾기"}</a></p>}
  </section>;
}
