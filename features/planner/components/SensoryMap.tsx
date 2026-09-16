"use client";
import { useEffect, useMemo, useState } from "react";
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
    [layer, setLayer] = useState("noise"),
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
  const points = places.flatMap((p) => {
    const point = supportedPlacePoint(p.mapX, p.mapY);
    return point ? [{ place: p, ...point }] : [];
  });
  const minX = Math.min(...points.map((p) => p.lng)),
    maxX = Math.max(...points.map((p) => p.lng));
  const minY = Math.min(...points.map((p) => p.lat)),
    maxY = Math.max(...points.map((p) => p.lat));
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
          .map((p) => ({
            id: p.place.id,
            name: p.place.name,
            distance: localDistanceKilometres(position.coords, p),
          }))
          .filter((p) => p.distance !== null)
          .sort((a, b) => a.distance! - b.distance!)[0];
        if (nearest) {
          setSelected(nearest.id);
          setReadings({});
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
        여행자가 직접 관찰한 소리·혼잡·이동·휴식 정보입니다. 관찰 후 2시간이
        지나면 현재 정보에서 제외해요. 제보가 없는 곳은 미확인입니다.
      </p>
      <div className={styles.actions}>
        {Object.entries(SENSORY_FIELDS).map(([key, field]) => (
          <button
            type="button"
            key={key}
            aria-pressed={layer === key}
            onClick={() => setLayer(key)}
          >
            {field.label}
          </button>
        ))}
      </div>
      <p>
        일정 장소의 상대적인 위치입니다. 숫자는 아래 장소 목록과 같아요.
        도로·통행 경로를 표시하는 지도는 아닙니다.
      </p>
      {!!points.length && (
        <svg
          width="100%"
          height="260"
          viewBox="0 0 600 260"
          role="img"
          aria-label={`${SENSORY_FIELDS[layer].label} 감각지도. 아래 목록에서 같은 정보를 읽고 장소를 선택할 수 있습니다.`}
        >
          <rect width="600" height="260" fill="#e7f1ed" />
          {points.map((p) => {
            const index = places.indexOf(p.place),
              summary = sensorySummary(
                reports.filter((r) => r.placeId === p.place.id),
                now,
              )[layer];
            const x = 50 + ((p.lng - minX) / (maxX - minX || 1)) * 500,
              y = 210 - ((p.lat - minY) / (maxY - minY || 1)) * 150;
            return (
              <g key={p.place.id}>
                <circle
                  cx={x}
                  cy={y}
                  r="20"
                  fill={summary.count && !error ? "#165f52" : "#586962"}
                />
                <text
                  x={x}
                  y={y + 6}
                  textAnchor="middle"
                  fill="white"
                  fontSize="18"
                >
                  {index + 1}
                </text>
                <text
                  x={x}
                  y={y + 39}
                  textAnchor="middle"
                  fill="#243b35"
                  fontSize="12"
                >
                  {error
                    ? "갱신 실패"
                    : summary.conflict
                      ? "제보 차이"
                      : summary.count
                        ? "제보 있음"
                        : "미확인"}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {error && (
        <p role="alert" className="modal-note">
          {error}
        </p>
      )}
      <p>
        {checkedAt
          ? `${new Date(checkedAt).toLocaleTimeString("ko-KR")} 조회 · 열린 화면에서 30초마다 갱신`
          : "현장 정보를 확인하고 있어요."}
      </p>
      <div className={styles.actions}>
        <button type="button" onClick={() => setVersion((v) => v + 1)}>
          현장 정보 새로 확인
        </button>
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
                onClick={() => {
                  setSelected(p.id);
                  setReadings({});
                  setNotice("");
                }}
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
                <small>좌표 미확인 · 목록으로 제공</small>
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
                  .filter(([k, v]) => SENSORY_FIELDS[k]?.values[v])
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
                <select value={ago} onChange={(e) => setAgo(e.target.value)}>
                  {[0, 15, 30, 60, 90].map((m) => (
                    <option key={m} value={m}>
                      {m ? `${m}분 전` : "방금"}
                    </option>
                  ))}
                </select>
              </label>
              {Object.entries(SENSORY_FIELDS).map(([key, field]) => (
                <label key={key}>
                  {field.label}
                  <select
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
                  </select>
                </label>
              ))}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                disabled={busy || !Object.values(readings).some(Boolean)}
                onClick={() => void submit()}
              >
                현장 정보 공유
              </button>
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
