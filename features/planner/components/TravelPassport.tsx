"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  passportEntry,
  PASSPORT_KINDS,
  type PassportEntry,
} from "../../../lib/experience.js";
import { communityToday } from "../../../lib/community/field-report.js";
import { localDistanceKilometres } from "../../../lib/device-location.js";
import { supportedPlacePoint } from "../../../lib/map-coordinates.js";
import type { Place } from "../types";
import styles from "./TravelExperience.module.css";
import AccessibleDateInput from '../../../components/AccessibleDateInput';
const KEY = "wave-travel-passport-v1";
export default function TravelPassport({
  places,
  region,
}: {
  places: Place[];
  region: string;
}) {
  const [entries, setEntries] = useState<PassportEntry[]>([]),
    [ready, setReady] = useState(false),
    [notice, setNotice] = useState("");
  const [placeId, setPlaceId] = useState(places[0]?.id || ""),
    [kind, setKind] = useState("visit"),
    [date, setDate] = useState("");
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setDate(communityToday());
      try {
        const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
        if (!Array.isArray(parsed)) throw new Error();
        setEntries(
          parsed.slice(0, 300).flatMap((v) => {
            try {
              return [passportEntry(v)];
            } catch {
              return [];
            }
          }),
        );
        setReady(true);
      } catch {
        setNotice(
          "여행여권을 불러오지 못했어요. 저장소를 확인한 뒤 화면을 다시 열어 주세요.",
        );
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const selectedId = places.some((p) => p.id === placeId)
    ? placeId
    : places[0]?.id || "";
  const selection = useRef("");
  useLayoutEffect(() => {
    selection.current = JSON.stringify([selectedId, date, kind]);
  }, [selectedId, date, kind]);
  const [locating, setLocating] = useState(false);
  useEffect(
    () => () => {
      selection.current = "";
    },
    [],
  );
  function nearbyVisit() {
    const chosen = places.find((p) => p.id === selectedId),
      point = chosen && supportedPlacePoint(chosen.mapX, chosen.mapY);
    if (!point || !navigator.geolocation) {
      setNotice(
        "장소 좌표나 위치 기능을 확인할 수 없어요. 직접 기록은 이용할 수 있습니다.",
      );
      return;
    }
    const snapshot = selection.current;
    setLocating(true);
    setNotice("기기 안에서 장소와의 거리를 확인하고 있어요.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        if (snapshot !== selection.current) return;
        const km = localDistanceKilometres(position.coords, point);
        if (
          !Number.isFinite(position.coords.accuracy) ||
          position.coords.accuracy > 100 ||
          km === null ||
          km * 1000 + 50 + position.coords.accuracy > 200
        ) {
          setNotice(
            "장소와 200m 이내인지 정확히 확인하지 못했어요. 직접 기록하거나 위치 수신이 좋아진 뒤 다시 시도해 주세요.",
          );
          return;
        }
        add("nearby");
      },
      () => {
        setLocating(false);
        if (snapshot === selection.current)
          setNotice("위치를 확인하지 못했어요. 직접 기록할 수 있습니다.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }
  function readLatest() {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(parsed)) throw new Error("저장한 기록을 확인해 주세요.");
    return parsed.map((v) => passportEntry(v));
  }
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === KEY) {
        try {
          setEntries(readLatest());
        } catch {
          setNotice("다른 탭의 기록을 불러오지 못했어요.");
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function remove(entry: PassportEntry) {
    try {
      const next = readLatest().filter(
        (v) =>
          !(
            v.placeId === entry.placeId &&
            v.date === entry.date &&
            v.kind === entry.kind
          ),
      );
      if (persist(next)) setNotice("선택한 개인 기록을 삭제했어요.");
    } catch {
      setNotice("기록을 삭제하지 못했어요. 기존 기록은 유지했어요.");
    }
  }
  function persist(next: PassportEntry[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setEntries(next);
      return true;
    } catch {
      setNotice("기기에 저장하지 못했어요. 이전 기록은 유지했어요.");
      return false;
    }
  }
  function add(method = "self") {
    try {
      if (!places.some((p) => p.id === selectedId))
        throw new Error("현재 일정의 장소를 선택해 주세요.");
      const entry = passportEntry({ placeId: selectedId, date, kind, method });
      const current = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (!Array.isArray(current))
        throw new Error("저장한 기록을 확인해 주세요.");
      const valid = current.map((v) => passportEntry(v));
      const next = [
        entry,
        ...valid.filter(
          (v) =>
            !(v.placeId === selectedId && v.date === date && v.kind === kind),
        ),
      ];
      if (next.length > 300)
        throw new Error(
          "여행 기록 300개를 채웠어요. 이전 기록을 내보내고 정리해 주세요.",
        );
      if (persist(next))
        setNotice(
          "나의 여행여권에 기록했어요. 방문 인증이나 혜택 지급을 뜻하지 않습니다.",
        );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "기록하지 못했어요.");
    }
  }
  function download() {
    const blob = new Blob([JSON.stringify({ version: 1, entries }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wave-travel-passport.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className={styles.card}>
      <h3>{region} 여행여권</h3>
      <p>
        내 속도로 만난 경남을 기록하세요. 방문·축제 참여·음성이나 글로 만난
        경험을 각각 남깁니다. 기록은 이 기기에만 저장되며 실제 방문 인증과
        구분됩니다.
      </p>
      <div className={styles.fields}>
        <label>
          기록할 장소
          <select
            value={selectedId}
            onChange={(e) => setPlaceId(e.target.value)}
          >
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          참여 방식
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {Object.entries(PASSPORT_KINDS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          참여 날짜
          <AccessibleDateInput
            value={date}
            max={communityToday()}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          onClick={() => add()}
          disabled={!ready || !selectedId || !date}
        >
          내 여행여권에 기록
        </button>
        <button
          type="button"
          disabled={
            !ready ||
            locating ||
            date !== communityToday() ||
            !["visit", "festival"].includes(kind)
          }
          onClick={nearbyVisit}
        >
          기기 위치로 방문 기록
        </button>
        <button
          type="button"
          onClick={download}
          disabled={!ready || !entries.length}
        >
          여행여권 내보내기
        </button>
      </div>
      <p role="status">{notice}</p>
      <p>
        나의 여행 문장:{" "}
        {new Set(entries.map((e) => e.kind)).size >= 3
          ? "풍경을 만나고, 이야기를 듣고, 다음 여행을 도왔어요."
          : entries.some((e) => e.kind === "story")
            ? "내 방식으로 경남의 이야기를 만났어요."
            : entries.length
              ? "경남에 나만의 장면을 남겼어요."
              : "첫 방문 기록을 남겨보세요."}
      </p>
      <div className={styles.actions}>
        {Object.entries(PASSPORT_KINDS).map(([id, label]) => (
          <span key={id}>
            {label}: {entries.filter((e) => e.kind === id).length}개
          </span>
        ))}
      </div>
      <ul>
        {entries.map((e) => (
          <li className={styles.card} key={`${e.placeId}-${e.date}-${e.kind}`}>
            <strong>
              {places.find((p) => p.id === e.placeId)?.name ||
                `기록한 장소 ${e.placeId}`}
            </strong>
            <p>
              {e.date} · {PASSPORT_KINDS[e.kind]} ·{" "}
              {e.method === "nearby" ? "기기에서 위치 근접 확인" : "직접 기록"}
            </p>
            <button
              type="button"
              aria-label={`${e.date} ${PASSPORT_KINDS[e.kind]} 기록 삭제`}
              onClick={() => remove(e)}
            >
              기록 삭제
            </button>
          </li>
        ))}
      </ul>
      {!entries.length && <p>아직 방문 기록이 없습니다.</p>}
      <p>
        많이 걷거나 빨리 완주하지 않아도 참여할 수 있어요. 위치 기록은 기기에서
        200m 이내 근접을 확인한 개인 기록이며 공식 방문 인증이 아닙니다. 좌표는
        저장하거나 전송하지 않아요. 현장 QR 인증·제휴 할인은 아직 제공하지
        않습니다.
      </p>
    </section>
  );
}
