"use client";
import NightIcon from '../../../components/NightIcon';

import WaveSelect from "../../../components/WaveSelect";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  SENSORY_FIELDS,
  sensorySummary,
  OBSERVATION_TTL,
  type Observation,
} from "../../../lib/experience.js";
import { supportedPlacePoint } from "../../../lib/map-coordinates.js";
import { localDistanceKilometres } from "../../../lib/device-location.js";
import { plannerJson } from "../services/api";
import type { Place } from "../types";
import PlaceAudioGuide from "./PlaceAudioGuide";
import styles from "./TravelExperience.module.css";
import { buildEvidenceReviewQueue } from "../../../lib/evidence-cycle.js";
const visibleSensoryKeys = ["mobility", "restroom"] as const;
type SensoryPoint = { place: Place; lng: number; lat: number; synthetic: boolean };

function SensoryLeafletMap({ points, places, layer, selected, onSelect }: {
  points: SensoryPoint[];
  places: Place[];
  layer: (typeof visibleSensoryKeys)[number];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let map: import("leaflet").Map | null = null;
    void import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      map = L.map(container.current, { scrollWheelZoom: false, keyboard: true, zoomControl: false });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      points.forEach((point) => {
        const number = places.indexOf(point.place) + 1;
        const pin = document.createElement("span");
        pin.className = [
          styles.sensoryMapPin,
          layer === "restroom" ? styles.sensoryMapPinRestroom : "",
          point.synthetic ? styles.sensoryMapPinSynthetic : "",
          point.place.id === selected ? styles.sensoryMapPinSelected : "",
        ].filter(Boolean).join(" ");
        pin.dataset.sensoryMarker = layer;
        pin.setAttribute("aria-hidden", "true");
        const numberLabel = document.createElement("span");
        numberLabel.textContent = String(number);
        pin.append(numberLabel);
        const label = point.synthetic
          ? `${point.place.name} · 시연용 임의 화장실 위치 · 실제 위치 아님`
          : `${point.place.name} · ${SENSORY_FIELDS[layer].label} 현장 정보 위치`;
        const popup = document.createElement("div");
        popup.className = styles.sensoryMapPopup;
        const title = document.createElement("strong");
        title.textContent = point.place.name;
        const note = document.createElement("p");
        note.textContent = point.synthetic
          ? "화면 확인을 위한 시연용 임의 위치이며 실제 화장실 위치가 아닙니다."
          : `${SENSORY_FIELDS[layer].label} 제보가 연결된 관광지 위치입니다. 시설의 정확한 위치는 현장에서 다시 확인해 주세요.`;
        popup.append(title, note);
        const icon = L.divIcon({ className: styles.sensoryMapIcon, html: pin, iconSize: [42, 48], iconAnchor: [21, 45] });
        const marker = L.marker([point.lat, point.lng], { icon, title: label, alt: label, keyboard: true })
          .addTo(map!)
          .bindPopup(popup);
        marker.on("click", () => onSelect(point.place.id));
        marker.getElement()?.setAttribute("role", "button");
        marker.getElement()?.setAttribute("aria-label", label);
      });
      const bounds = L.latLngBounds(points.map(point => [point.lat, point.lng] as [number, number]));
      if (points.length === 1) map.setView(bounds.getCenter(), 14, { animate: false });
      else map.fitBounds(bounds, { padding: [42, 42], maxZoom: 14, animate: false });
      setState("ready");
      frame = requestAnimationFrame(() => { if (!cancelled) map?.invalidateSize({ animate: false }); });
    }).catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; cancelAnimationFrame(frame); map?.remove(); };
  }, [layer, onSelect, places, points, selected]);
  return <div className={styles.sensoryMapFrame}>
    <div ref={container} className={styles.sensoryMap} data-testid="sensory-leaflet-map" role="region" aria-label={`${SENSORY_FIELDS[layer].label} 감각지도`} />
    {state === "loading" && <p className={styles.sensoryMapStatus} role="status">지도를 불러오고 있어요.</p>}
    {state === "error" && <p className={styles.sensoryMapStatus} role="alert">지도 바탕을 불러오지 못했어요. 아래 장소 목록에서 정보를 확인해 주세요.</p>}
  </div>;
}

export default function SensoryMap({
  places,
  onSelectPlace,
}: {
  places: Place[];
  onSelectPlace?: (place: Place) => void;
}) {
  const [reports, setReports] = useState<Observation[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [checkedAt, setCheckedAt] = useState(0),
    [now, setNow] = useState(0),
    [version, setVersion] = useState(0);
  const [selected, setSelected] = useState(places[0]?.id || ""),
    [layer, setLayer] = useState<(typeof visibleSensoryKeys)[number]>("mobility"),
    [busy, setBusy] = useState(false);
  const [readings, setReadings] = useState<Record<string, string>>({}),
    [ago, setAgo] = useState("0");
  const [nearby, setNearby] = useState("");
  const ids = places
    .map((p) => p.id)
    .filter((id) => /^\d{1,20}$/.test(id))
    .slice(0, 12)
    .join(",");
  const place = places.find((p) => p.id === selected) || places[0];
  const reviewQueue = useMemo(() => buildEvidenceReviewQueue(places, reports, now), [places, reports, now]);
  useEffect(() => {
    if (!ids) return;
    const controller = new AbortController();
    let loading = false;
    async function refresh() {
      if (loading || document.hidden) return;
      loading = true;
      try {
        const data = await plannerJson<{
          reports: Observation[];
          checkedAt: number;
        }>(`/api/observations?ids=${ids}`, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setReports(data.reports);
          setCheckedAt(data.checkedAt);
          setNow(Date.now());
          setError("");
        }
      } catch {
        if (!controller.signal.aborted)
          setError(
            "현장 정보를 새로 확인하지 못했어요. 이전 제보가 남아 있어도 현재 상태는 미확인입니다.",
          );
      } finally {
        loading = false;
      }
    }
    const first = setTimeout(() => void refresh(), 0),
      poll = setInterval(() => void refresh(), 30000),
      tick = setInterval(() => setNow(Date.now()), 10000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      clearInterval(tick);
      controller.abort();
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [ids, version]);
  const points = useMemo<SensoryPoint[]>(() => places.flatMap((p, index): SensoryPoint[] => {
    const point = supportedPlacePoint(p.mapX, p.mapY);
    if (point) return [{ place: p, ...point, synthetic: false }];
    // Arbitrary pins belong only to labelled local DEV examples, never real unknown locations.
    return import.meta.env.DEV && p.source === "로컬 예시 데이터 · 실제 관광정보 아님"
      ? [{ place: p, lng: 128.1 + (index % 4) * 0.12, lat: 35.05 + Math.floor(index / 4) * 0.1, synthetic: true }]
      : [];
  }), [places]);
  const selectPlace = useCallback((id: string) => {
    setSelected(id);
    setReadings({});
    setNotice("");
  }, []);
  function nearbyGuide() {
    if (!navigator.geolocation) {
      setNearby(
        "이 브라우저에서는 위치를 확인할 수 없어요. 아래 장소를 직접 선택해 주세요.",
      );
      return;
    }
    setNearby("기기에서 가까운 일정 장소를 찾고 있어요.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = points
          .filter((p) => !p.synthetic)
          .map((p) => ({
            id: p.place.id,
            name: p.place.name,
            distance: localDistanceKilometres(position.coords, p),
          }))
          .filter((p) => p.distance !== null)
          .sort((a, b) => a.distance! - b.distance!)[0];
        if (nearest) {
          selectPlace(nearest.id);
          setNearby(
            `${nearest.name} · 직선거리 약 ${nearest.distance}km. 실제 통행 경로와 다를 수 있어요.`,
          );
        } else
          setNearby(
            "좌표를 확인한 일정 장소가 없어요. 장소를 직접 선택해 주세요.",
          );
      },
      () =>
        setNearby(
          "위치 권한이나 수신 상태를 확인해 주세요. 아래 장소를 직접 선택할 수 있어요.",
        ),
      { timeout: 8000, maximumAge: 0 },
    );
  }
  async function submit(operation = "create") {
    if (!place || busy) return;
    setBusy(true);
    setNotice("");
    try {
      await plannerJson("/api/observations", {
        method: "POST",
        body: {
          operation,
          placeId: place.id,
          observedAt: Date.now() - Number(ago) * 60000,
          readings,
        },
      });
      setNotice(
        operation === "remove"
          ? "이 장소에 남긴 내 현장 정보를 삭제했어요."
          : "직접 관찰한 현장 정보를 공유했어요. 관찰 시각부터 2시간 동안 표시됩니다.",
      );
      setVersion((v) => v + 1);
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "공유하지 못했어요. 입력은 유지했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!places.length)
    return <p>여행지를 일정에 담으면 감각지도에서 확인할 수 있어요.</p>;
  return (
    <div className={styles.experience}>
      <h3>감각지도·지금 현장</h3>
      <p>
        여행자가 직접 관찰한 휠체어 이동·화장실 정보입니다. 관찰 후 2시간이
        지나면 현재 정보에서 제외해요. 제보가 없는 곳은 미확인입니다.
      </p>
      <div className={styles.actions}>
        {visibleSensoryKeys.map(key => (
          <button
            type="button"
            key={key}
            aria-pressed={layer === key}
            onClick={() => setLayer(key)}
          >
            {SENSORY_FIELDS[key].label}
          </button>
        ))}
      </div>
      <p>관광지의 등록 좌표를 바탕으로 표시한 지도입니다. 숫자는 아래 장소 목록과 같아요. 시설 입구나 실제 화장실의 정확한 위치는 현장에서 다시 확인해 주세요.</p>
      {points.some(point => point.synthetic) && <p className="modal-note">시연용 임의 화장실 표시는 로컬 화면 확인용이며 실제 위치가 아닙니다.</p>}
      {!!points.length && (
        <SensoryLeafletMap points={points} places={places} layer={layer} selected={place?.id || ""} onSelect={selectPlace} />
      )}
      {error && (
        <p role="alert" className="modal-note">
          {error}
        </p>
      )}
      <p>
        {error
          ? "새로 확인을 눌러 다시 시도할 수 있어요."
          : checkedAt
          ? `${new Date(checkedAt).toLocaleTimeString("ko-KR")} 조회 · 열린 화면에서 30초마다 갱신`
          : "현장 정보를 확인하고 있어요."}
      </p>
      <div className={styles.actions}>
        <button type="button" onClick={() => setVersion((v) => v + 1)} data-icon-action="" title="현장 정보 새로 확인"><NightIcon name="refresh" size={20}/><span className="sr-only">현장 정보 새로 확인</span></button>
        <button type="button" onClick={nearbyGuide}>
          내 근처 일정 장소 찾기
        </button>
      </div>
      <p>위치는 가까운 장소 계산에만 쓰고 서버로 보내거나 저장하지 않아요.</p>
      <p role="status">{nearby}</p>
      <ol>
        {places.map((p) => {
          const s = sensorySummary(
            reports.filter((r) => r.placeId === p.id),
            now,
          )[layer];
          return (
            <li key={p.id} className={styles.card}>
              <button
                type="button"
                aria-pressed={place?.id === p.id}
                onClick={() => selectPlace(p.id)}
              >
                {p.name}
              </button>
              <p>
                {SENSORY_FIELDS[layer].label}:{" "}
                {s.values
                  .map((v) => SENSORY_FIELDS[layer].values[v])
                  .join(" / ") || "미확인"}
                {s.conflict ? " · 서로 다른 제보가 있어요" : ""}
              </p>
              {!supportedPlacePoint(p.mapX, p.mapY) && (
                <small>{points.some(point => point.place.id === p.id && point.synthetic)
                  ? "좌표 미확인 · 지도에는 시연용 임의 위치를 표시하며 실제 위치가 아닙니다."
                  : "좌표 미확인 · 목록으로 제공"}</small>
              )}
            </li>
          );
        })}
      </ol>
      <details className={styles.card}>
        <summary>공식정보 재확인 목록 {reviewQueue.length ? `${reviewQueue.length}곳` : "없음"}</summary>
        <p>최근 현장 관찰과 공식 접근로 정보를 대조합니다. 제보가 공식정보를 자동으로 바꾸지는 않으며, 다시 확인할 순서만 제안해요.</p>
        {!reviewQueue.length ? <p>현재 자료에서 다시 확인할 항목이 없어요.</p> : <ol>{reviewQueue.map(item => <li className={styles.card} key={item.placeId}><strong>{item.name} · {item.priority === "high" ? "우선 확인" : item.priority === "medium" ? "확인 권장" : "다음 확인 때 참고"}</strong><p>{item.reason}</p><small>최근 제보 {item.reports}건 · 공식 접근로 {item.officialState === "confirmed" ? "확인됨" : item.officialState === "negative" ? "조건과 맞지 않음" : "미확인"}</small>{onSelectPlace && <button type="button" onClick={() => { const target = places.find(place => place.id === item.placeId); if (target) onSelectPlace(target); }}>공식 원문·문의 확인</button>}</li>)}</ol>}
      </details>
      {place && (
        <section className={styles.card} key={place.id}>
          <h4>{place.name} 현장 살펴보기</h4>
          {onSelectPlace && (
            <button type="button" onClick={() => onSelectPlace(place)}>
              공식 편의·운영 정보 보기
            </button>
          )}
          {reports
            .filter(
              (r) =>
                r.placeId === place.id && r.observedAt + OBSERVATION_TTL > now,
            )
            .map((r, i) => (
              <p key={r.id || i}>
                여행자 관찰 · {new Date(r.observedAt).toLocaleString("ko-KR")} ·{" "}
                {Object.entries(r.readings)
                  .filter(([k, v]) => visibleSensoryKeys.includes(k as (typeof visibleSensoryKeys)[number]) && SENSORY_FIELDS[k]?.values[v])
                  .map(
                    ([k, v]) =>
                      `${SENSORY_FIELDS[k].label}: ${SENSORY_FIELDS[k].values[v]}`,
                  )
                  .join(" / ")}
              </p>
            ))}
          <PlaceAudioGuide key={place.id} id={place.id} />
          <details>
            <summary>지금 이 장소에서 직접 본 정보 공유</summary>
            <p>
              직접 확인한 항목만 선택해 주세요. 휠체어 이동은 관찰한 경로의
              상태이며 관광지 전체의 접근 가능성을 뜻하지 않습니다.
            </p>
            <div className={styles.fields}>
              <label>
                관찰한 때
                <WaveSelect value={ago} onChange={(e) => setAgo(e.target.value)}>
                  {[0, 15, 30, 60, 90].map((m) => (
                    <option key={m} value={m}>
                      {m ? `${m}분 전` : "방금"}
                    </option>
                  ))}
                </WaveSelect>
              </label>
              {visibleSensoryKeys.map(key => {
                const field = SENSORY_FIELDS[key];
                return (
                <label key={key}>
                  {field.label}
                  <WaveSelect
                    value={readings[key] || ""}
                    onChange={(e) =>
                      setReadings({ ...readings, [key]: e.target.value })
                    }
                  >
                    <option value="">확인하지 않음</option>
                    {Object.entries(field.values).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </WaveSelect>
                </label>
              );})}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                disabled={busy || !Object.values(readings).some(Boolean)}
                onClick={() => void submit()}
               data-icon-action="" title="현장 정보 공유"><NightIcon name="share" size={20}/><span className="sr-only">현장 정보 공유</span></button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit("remove")}
              >
                이 장소의 내 제보 삭제
              </button>
              <Link href="/login?next=%2Fplanner">로그인</Link>
            </div>
            <p role="status">{notice}</p>
          </details>
        </section>
      )}
    </div>
  );
}
