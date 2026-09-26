"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import type { useTripSelection } from "../../planner/hooks/useTripSelection";
import { plannerJson } from "../../planner/services/api";
import {
  companionSnapshot,
  type CompanionSelections,
} from "../../../lib/experience.js";
import { readTripIdentity } from "../../../lib/trip-identity.js";
import { assertTripStorageOwner } from "../../../lib/current-trip-storage.js";
import type { TripCommand } from "../../../lib/trip-command.js";
import styles from "../../planner/components/TravelExperience.module.css";
export default function CompanionLauncher({
  trip,
  region,
}: {
  trip: ReturnType<typeof useTripSelection>;
  region: string;
}) {
  const [id, setId] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{
    selections: CompanionSelections;
    revision: number;
    localRevision: string;
    tripId: string;
  } | null>(null);
  const latest = useRef(trip.voiceRevision);
  const scope = useRef("");
  useLayoutEffect(() => {
    latest.current = trip.voiceRevision;
  }, [trip.voiceRevision]);
  useEffect(() => {
    const restore = () => {
      try {
        const identity = readTripIdentity(localStorage);
        if (scope.current === (identity?.id || "")) return;
        scope.current = identity?.id || "";
        const saved =
          identity &&
          localStorage.getItem(`wave-companion-room-${identity.id}`);
        setId(saved && /^[a-f0-9]{24}$/.test(saved) ? saved : "");
        setPreview(null);
      } catch {
        setNotice("동행 일정 연결을 복원하지 못했어요.");
      }
    };
    const frame = requestAnimationFrame(restore);
    window.addEventListener("storage", restore);
    window.addEventListener("focus", restore);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("storage", restore);
      window.removeEventListener("focus", restore);
    };
  }, [trip.voiceRevision]);
  function assertScope() {
    assertTripStorageOwner(localStorage);
    const identity = readTripIdentity(localStorage);
    if (!identity || identity.id !== scope.current)
      throw new Error(
        "다른 여행이 열렸어요. 현재 여행에서 동행 도우미를 다시 열어 주세요.",
      );
    return identity;
  }
  function disconnect() {
    try {
      const identity = assertScope();
      if (identity)
        localStorage.removeItem(`wave-companion-room-${identity.id}`);
      setId("");
      setPreview(null);
      setNotice(
        "이 기기의 연결을 해제했어요. 기존 동행 일정은 해당 화면에서 종료할 수 있어요.",
      );
    } catch {
      setNotice("연결을 해제하지 못했어요.");
    }
  }
  async function create() {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const identity = assertScope();
      const selections = companionSnapshot({
        region,
        theme: "",
        travelStart: trip.travelStart,
        travelEnd: trip.travelEnd,
        dayStartTime: trip.dayStartTime,
        travelMode: trip.travelMode,
        selectedPlaceIds: trip.orderedPlaceIds,
        scheduleAssignments: trip.scheduleAssignments,
        visitMinutesByPlaceId: trip.visitMinutesByPlaceId,
        breakMinutesByPlaceId: trip.breakMinutesByPlaceId,
        fixedVisits: trip.fixedVisits,
        dayDeadlines: trip.dayDeadlines,
        restPurposeByPlaceId: trip.restPurposeByPlaceId,
      });
      const data = await plannerJson<{ id: string }>("/api/companions", {
        method: "POST",
        body: { selections },
      });
      if (!/^[a-f0-9]{24}$/.test(data.id))
        throw new Error("동행 일정 주소를 확인하지 못했어요.");
      if (
        readTripIdentity(localStorage)?.id !== identity.id ||
        scope.current !== identity.id
      )
        throw new Error(
          "동행 일정을 만드는 동안 다른 여행이 열렸어요. 현재 여행에는 연결하지 않았습니다.",
        );
      setId(data.id);
      try {
        localStorage.setItem(`wave-companion-room-${identity.id}`, data.id);
      } catch {
        setNotice(
          "동행 일정은 만들어졌지만 기기에 연결을 저장하지 못했어요. 아래 주소를 보관해 주세요.",
        );
      }
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "동행 일정을 만들지 못했어요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function load() {
    if (busy) return;
    setBusy(true);
    try {
      const identity = assertScope();
      const localRevision = trip.voiceRevision;
      const data = await plannerJson<{
        selections: CompanionSelections;
        revision: number;
      }>(`/api/companions/${id}`);
      if (
        latest.current !== localRevision ||
        readTripIdentity(localStorage)?.id !== identity.id
      )
        throw new Error("조회 중 원래 일정이 바뀌었어요. 다시 확인해 주세요.");
      setPreview({ ...data, localRevision, tripId: identity.id });
      setNotice("");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    if (!preview || busy) return;
    setBusy(true);
    try {
      if (assertScope().id !== preview.tripId)
        throw new Error(
          "다른 여행의 변경안입니다. 현재 여행에서 다시 확인해 주세요.",
        );
      const data = await plannerJson<{ revision: number }>(
        `/api/companions/${id}`,
      );
      if (
        data.revision !== preview.revision ||
        latest.current !== preview.localRevision ||
        readTripIdentity(localStorage)?.id !== preview.tripId
      )
        throw new Error(
          "동행 일정 또는 원래 일정이 바뀌었어요. 새 변경안을 다시 확인해 주세요.",
        );
      const s = preview.selections;
      if (
        JSON.stringify([...s.selectedPlaceIds].sort()) !==
          JSON.stringify([...trip.saved].sort()) ||
        s.travelStart !== trip.travelStart ||
        s.travelEnd !== trip.travelEnd ||
        JSON.stringify(s.fixedVisits) !== JSON.stringify(trip.fixedVisits)
      )
        throw new Error(
          "장소·날짜·고정 방문이 달라 자동 반영할 수 없어요. 원래 일정과 동행 일정을 나란히 확인해 주세요.",
        );
      const commands: TripCommand[] = [],
        order = [...trip.orderedPlaceIds];
      for (const day of trip.tripDays) {
        const desired = s.selectedPlaceIds.filter(
            (x) => s.scheduleAssignments[x] === day,
          ),
          current = order.filter(
            (x) => (trip.scheduleAssignments[x] || trip.travelStart) === day,
          );
        if (
          JSON.stringify([...desired].sort()) !==
          JSON.stringify([...current].sort())
        )
          throw new Error("방문 날짜가 달라 자동 반영할 수 없어요.");
        for (let i = 0; i < desired.length; i++) {
          let j = current.indexOf(desired[i]);
          while (j > i) {
            commands.push({ type: "move", id: desired[i], direction: "up" });
            [current[j - 1], current[j]] = [current[j], current[j - 1]];
            j--;
          }
        }
      }
      for (const stopId of s.selectedPlaceIds) {
        if (
          s.visitMinutesByPlaceId[stopId] !==
            trip.visitMinutesByPlaceId[stopId] ||
          s.breakMinutesByPlaceId[stopId] !== trip.breakMinutesByPlaceId[stopId]
        )
          commands.push({
            type: "stop",
            id: stopId,
            minutes: s.visitMinutesByPlaceId[stopId] ?? null,
            breakMinutes: s.breakMinutesByPlaceId[stopId] ?? null,
          });
      }
      if (!commands.length) {
        setNotice("반영할 변경이 없어요.");
        setPreview(null);
        return;
      }
      const result = trip.applyTripCommand(commands);
      if (!result.ok) throw new Error(result.reason);
      setNotice(
        "동행의 변경을 내 일정에 반영했어요. 필요한 편의는 유지했으며 되돌리기도 가능합니다.",
      );
      setPreview(null);
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.card}>
      <h3>동행과 함께 편집</h3>
      <p>
        동행 전용 일정에서 같은 날짜와 방문을 함께 조정해요. 보기·제안·편집
        초대를 나누고, 합의한 변경을 이 일정에 가져올 수 있습니다.
      </p>
      <p>
        장소·날짜·시간만 공유하며 개인 편의 선택·메모·현재 위치는 보내지 않아요.
        동행 일정은 30일 동안 보관합니다.
      </p>
      {!id ? (
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => void create()}
            disabled={busy || !trip.saved.length}
          >
            동행 일정 만들기
          </button>
          <Link href="/login?next=%2Fplanner">계정으로 로그인</Link>
        </div>
      ) : (
        <div className={styles.actions}>
          <Link
            href={`/companion/${id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            동행 일정 열기
          </Link>
          <button type="button" disabled={busy} onClick={() => void load()}>
            동행의 변경 확인
          </button>
          <button type="button" disabled={busy} onClick={disconnect}>
            연결 해제·새로 만들기
          </button>
        </div>
      )}
      {preview && (
        <div className={styles.card}>
          <h4>동행 일정 버전 {preview.revision}</h4>
          <ol>
            {preview.selections.selectedPlaceIds.map((stopId) => (
              <li key={stopId}>
                {trip.orderedSavedPlaces.find((p) => p.id === stopId)?.name ||
                  stopId}{" "}
                · {preview.selections.scheduleAssignments[stopId]} · 체류{" "}
                {preview.selections.visitMinutesByPlaceId[stopId] ?? "기본"}분 ·
                휴식 {preview.selections.breakMinutesByPlaceId[stopId] || 0}분
              </li>
            ))}
          </ol>
          <div className={styles.actions}>
            <button
              type="button"
              disabled={busy || preview.localRevision !== trip.voiceRevision}
              onClick={() => void apply()}
            >
              확인한 변경을 내 일정에 반영
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              취소
            </button>
          </div>
        </div>
      )}
      <p role="status">{notice}</p>
    </section>
  );
}
