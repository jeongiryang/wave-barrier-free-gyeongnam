"use client";
import { useState } from "react";
import { useOpenNaru } from "../../../components/GlobalTravelWorkspace";
import { buildItinerarySchedule } from "../optimization/itinerary-schedule.js";
import { suggestTripBreaks, assessWalking } from "../../../lib/trip-comfort.js";
import {
  planTripCommand,
  type TripCommand,
} from "../../../lib/trip-command.js";
import { assessDayDeadline } from "../../../lib/trip-time-constraints.js";
import type { ExperienceProps } from "./TravelExperience";
import styles from "./TravelExperience.module.css";
export default function TodayPace({
  trip,
  coverage,
  origin,
  region,
}: ExperienceProps) {
  const openNaru = useOpenNaru();
  const [walk, setWalk] = useState(String(trip.comfort.maxWalkMinutes || 15)),
    [rest, setRest] = useState("20"),
    [mood, setMood] = useState("조용하게 쉬고 싶어");
  const [proposal, setProposal] = useState<{
      revision: string;
      commands: TripCommand[];
      before: string;
      after: string;
      changes: string[];
      warning: string;
    } | null>(null),
    [notice, setNotice] = useState("");
  const schedule = (
    visits = trip.visitMinutesByPlaceId,
    breaks = trip.breakMinutesByPlaceId,
  ) =>
    buildItinerarySchedule({
      places: trip.orderedSavedPlaces,
      days: trip.tripDays,
      assignments: trip.scheduleAssignments,
      startTime: trip.dayStartTime,
      visitMinutesByPlaceId: visits,
      breakMinutesByPlaceId: breaks,
      fixedVisits: trip.fixedVisits,
      origin,
      routeMinutesByPlaceId: coverage.routeMinutes,
    });
  const active = schedule().find((d) => d.day === trip.activeDay);
  const walking = assessWalking(
    (active?.entries || []).map((e) => ({
      id: e.place.id,
      evidence: coverage.walkingByPlaceId[e.place.id] || null,
    })),
    Number(walk),
  );
  function preview() {
    const days = schedule(),
      comfort = {
        maxWalkMinutes: Number(walk),
        breakEveryMinutes: 60,
        breakMinutes: Number(rest),
      };
    const breaks = suggestTripBreaks(
      days.filter((d) => d.day === trip.activeDay),
      comfort,
      trip.breakMinutesByPlaceId,
    );
    const commands: TripCommand[] = [
      { type: "comfort", value: comfort },
      ...Object.entries(breaks).map(([id, minutes]) => ({
        type: "stop" as const,
        id,
        breakMinutes: minutes,
      })),
    ];
    let state = trip.voiceState;
    for (const command of commands) {
      const result = planTripCommand(state, command, trip.orderedSavedPlaces);
      if (!result.ok) {
        setNotice(result.reason);
        return;
      }
      state = result.after;
    }
    const after = schedule(state.visits, state.breaks).find(
        (d) => d.day === trip.activeDay,
      ),
      deadline = assessDayDeadline(
        after?.entries || [],
        trip.dayDeadlines[trip.activeDay],
      );
    setProposal({
      revision: trip.voiceRevision,
      commands,
      before: active?.entries.at(-1)?.endsAtLabel || "방문 없음",
      after: after?.entries.at(-1)?.endsAtLabel || "방문 없음",
      changes: Object.entries(breaks).map(
        ([id, n]) =>
          `${trip.orderedSavedPlaces.find((p) => p.id === id)?.name}: 휴식 ${trip.breakMinutesByPlaceId[id] || 0} → ${n}분`,
      ),
      warning:
        deadline?.state === "over"
          ? "귀가 마감 시간을 넘겨요. 휴식안 적용 전에 방문 수나 귀가 계획을 조정해 주세요."
          : after?.entries.some((e) => e.lateMinutes > 0)
            ? "고정 방문 도착이 늦어질 수 있어요. 적용 전에 확인해 주세요."
            : "",
    });
    setNotice("");
  }
  return (
    <div className={styles.card}>
      <h3>오늘의 페이스</h3>
      <p>
        {region} · {trip.activeDay}의 일정에 맞춰 이동과 휴식을 다시 살펴요.
      </p>
      <div className={styles.fields}>
        <label>
          오늘 편안한 연속 걷기
          <select
            value={walk}
            onChange={(e) => {
              setWalk(e.target.value);
              setProposal(null);
            }}
          >
            {[5, 10, 15, 20, 30, 45, 60].map((n) => (
              <option key={n} value={n}>
                {n}분
              </option>
            ))}
          </select>
        </label>
        <label>
          쉬어 갈 시간
          <select
            value={rest}
            onChange={(e) => {
              setRest(e.target.value);
              setProposal(null);
            }}
          >
            {[10, 15, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n}분
              </option>
            ))}
          </select>
        </label>
        <label>
          지금 원하는 분위기
          <select value={mood} onChange={(e) => setMood(e.target.value)}>
            {[
              "조용하게 쉬고 싶어",
              "이동을 줄이고 싶어",
              "경남 풍경을 천천히 즐기고 싶어",
              "일찍 돌아가고 싶어",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <p>
        조회한 걷기 {walking.checked}구간 · 미확인 {walking.unknown}구간 · 기준
        초과 {walking.overLimit.length}구간
      </p>
      {walking.overLimit.map((item) => (
        <p key={item.id} className="modal-note">
          {trip.orderedSavedPlaces.find((p) => p.id === item.id)?.name}: 연속
          걷기 {item.minutes}분. 휴식을 넣어도 이 구간의 걷기는 줄지 않아요.
        </p>
      ))}
      <div className={styles.actions}>
        <button
          type="button"
          onClick={preview}
          disabled={!active?.entries.length}
        >
          휴식 변경안 미리보기
        </button>
        <button
          type="button"
          onClick={() =>
            openNaru(
              `${region}의 기존 ${trip.activeDay} 일정에서 ${mood}. 오늘 연속 걷기는 ${walk}분 이내, 휴식은 ${rest}분씩 원해. 지역과 고정 방문, 필수 편의, 귀가 마감을 유지해. 확인되지 않은 소음이나 휠체어 통행은 미확인으로 남기고 변경안을 먼저 보여줘.`,
            )
          }
        >
          나루에게 맞춤 동선 요청
        </button>
      </div>
      <p>
        분위기는 나루에 보낼 요청에 담겨요. 휴식안은 약 60분 간격으로 계산하며
        좌석의 실제 운영은 감각지도·공식 정보에서 확인해 주세요.
      </p>
      {proposal && (
        <section className={styles.card} aria-label="오늘의 페이스 변경안">
          <h4>적용 전 확인</h4>
          <p>
            마지막 방문 종료 {proposal.before} → {proposal.after} · 이동시간에는
            미확인·추정 구간이 포함될 수 있어요.
          </p>
          <ul>
            {proposal.changes.length ? (
              proposal.changes.map((s) => <li key={s}>{s}</li>)
            ) : (
              <li>추가 휴식 없이 오늘의 걷기·휴식 기준만 변경해요.</li>
            )}
          </ul>
          {proposal.warning && <p role="alert">{proposal.warning}</p>}
          <div className={styles.actions}>
            <button
              type="button"
              disabled={
                proposal.revision !== trip.voiceRevision || !!proposal.warning
              }
              onClick={() => {
                if (proposal.revision !== trip.voiceRevision) return;
                const result = trip.applyTripCommand(proposal.commands);
                setNotice(
                  result.ok
                    ? "오늘의 페이스를 반영했어요. 일정 위의 되돌리기로 복원할 수 있어요."
                    : result.reason,
                );
                if (result.ok) setProposal(null);
              }}
            >
              이 변경안 적용
            </button>
            <button type="button" onClick={() => setProposal(null)}>
              취소
            </button>
          </div>
          {proposal.revision !== trip.voiceRevision && (
            <p>일정이 바뀌었어요. 변경안을 다시 만들어 주세요.</p>
          )}
        </section>
      )}
      <p role="status">{notice}</p>
    </div>
  );
}
