import { liveSharePayload } from "./trips/live-share.js";
import {
  validCommunityDate,
  communityToday,
} from "./community/field-report.js";

export const OBSERVATION_TTL = 2 * 60 * 60 * 1000;
export const SENSORY_FIELDS = {
  noise: {
    label: "소리",
    values: {
      quiet: "대화하기 편안함",
      moderate: "주변 소리가 있음",
      loud: "큰 소리·확성기",
    },
  },
  crowd: {
    label: "혼잡",
    values: { low: "여유 있음", moderate: "일부 대기", high: "붐빔·긴 대기" },
  },
  mobility: {
    label: "휠체어 이동",
    values: {
      clear: "관찰한 경로에 장애물 없음",
      difficult: "우회·도움 필요",
      blocked: "관찰한 경로 통행 막힘",
    },
  },
  rest: {
    label: "쉬는 곳",
    values: {
      available: "빈 휴식 좌석 있음",
      full: "휴식 좌석 만석",
      absent: "관찰 범위에 좌석 없음",
    },
  },
  light: {
    label: "빛",
    values: { soft: "눈부심 적음", bright: "강한 빛", flashing: "점멸 조명" },
  },
};
export function observationInput(value, now = Date.now()) {
  if (!/^\d{1,20}$/.test(value?.placeId || ""))
    throw new Error("공식 장소를 선택해 주세요.");
  const observedAt = Number(value.observedAt);
  if (
    !Number.isSafeInteger(observedAt) ||
    observedAt > now ||
    observedAt < now - OBSERVATION_TTL
  )
    throw new Error("최근 2시간 안에 직접 관찰한 시각을 선택해 주세요.");
  const readings = Object.fromEntries(
    Object.entries(SENSORY_FIELDS).flatMap(([key, field]) =>
      Object.hasOwn(field.values, value.readings?.[key])
        ? [[key, value.readings[key]]]
        : [],
    ),
  );
  if (!Object.keys(readings).length)
    throw new Error("직접 확인한 항목을 하나 이상 선택해 주세요.");
  return { placeId: value.placeId, observedAt, readings };
}
/** Conflicting observations remain visible, never averaged into a safety rating. */
export function sensorySummary(reports, now = Date.now()) {
  return Object.fromEntries(
    Object.entries(SENSORY_FIELDS).map(([key, field]) => {
      const current = reports.filter(
        (r) =>
          Number.isFinite(r.observedAt) &&
          r.observedAt <= now &&
          r.observedAt + OBSERVATION_TTL > now &&
          Object.hasOwn(field.values, r.readings?.[key]),
      );
      const values = [...new Set(current.map((r) => r.readings[key]))];
      return [
        key,
        { values, count: current.length, conflict: values.length > 1 },
      ];
    }),
  );
}

export function companionSnapshot(selections) {
  return liveSharePayload({ selections }).selections;
}
/** A room may edit only existing stops; hard requirements never enter shared storage. */
export function editCompanionStop(selections, edit) {
  const next = companionSnapshot(selections);
  const ids = [...next.selectedPlaceIds];
  if (!ids.includes(edit?.id))
    throw new Error("일정에 있는 장소를 선택해 주세요.");
  if (next.fixedVisits[edit.id])
    throw new Error(
      "고정 방문은 동행 화면에서 바꿀 수 없어요. 원래 일정에서 확인해 주세요.",
    );
  if (edit.direction) {
    if (!["up", "down"].includes(edit.direction))
      throw new Error("이동 방향을 확인해 주세요.");
    const day = next.scheduleAssignments[edit.id];
    const today = ids.filter((id) => next.scheduleAssignments[id] === day);
    const target =
      today[today.indexOf(edit.id) + (edit.direction === "up" ? -1 : 1)];
    if (!target || next.fixedVisits[target])
      throw new Error(
        "같은 날의 고정되지 않은 방문 사이에서 이동할 수 있어요.",
      );
    const a = ids.indexOf(edit.id),
      b = ids.indexOf(target);
    [ids[a], ids[b]] = [ids[b], ids[a]];
    next.selectedPlaceIds = ids;
  } else {
    if (
      !Number.isInteger(edit.minutes) ||
      edit.minutes < 15 ||
      edit.minutes > 720 ||
      !Number.isInteger(edit.breakMinutes) ||
      edit.breakMinutes < 0 ||
      edit.breakMinutes > 120
    )
      throw new Error("체류 15~720분, 휴식 0~120분을 입력해 주세요.");
    next.visitMinutesByPlaceId = {
      ...next.visitMinutesByPlaceId,
      [edit.id]: edit.minutes,
    };
    next.breakMinutesByPlaceId = {
      ...next.breakMinutesByPlaceId,
      [edit.id]: edit.breakMinutes,
    };
  }
  return next;
}
export function splitExpense(amount, participants, payer) {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10000000)
    throw new Error("금액은 1~10,000,000원으로 입력해 주세요.");
  if (
    !Array.isArray(participants) ||
    participants.length < 1 ||
    participants.length > 12 ||
    new Set(participants).size !== participants.length ||
    participants.some(
      (p) => typeof p !== "string" || !/^[가-힣a-zA-Z0-9 _-]{1,20}$/.test(p),
    ) ||
    !participants.includes(payer)
  )
    throw new Error(
      "탑승자 별칭을 중복 없이 입력하고 결제자를 탑승자 중에서 골라 주세요.",
    );
  const base = Math.floor(amount / participants.length),
    extra = amount % participants.length;
  return participants.map((name, i) => ({
    name,
    amount: base + (i < extra ? 1 : 0),
    payer: name === payer,
  }));
}
export function transportExpense(value, ids) {
  if (
    !ids.includes(value?.toId) ||
    !["taxi", "accessible-taxi", "bus", "other"].includes(value.mode) ||
    !["planned", "requested", "confirmed", "completed", "cancelled"].includes(
      value.status,
    )
  )
    throw new Error("이동 구간과 교통 상태를 확인해 주세요.");
  const participants = value.participants;
  const shares = splitExpense(value.amount, participants, value.payer);
  return {
    toId: value.toId,
    mode: value.mode,
    status: value.status,
    amount: value.amount,
    participants,
    payer: value.payer,
    shares,
  };
}
export function passportEntry(value, now = Date.now()) {
  if (
    !/^\d{1,20}$/.test(value?.placeId || "") ||
    !validCommunityDate(value.date) ||
    value.date > communityToday(now) ||
    !["visit", "festival", "story", "observation"].includes(value.kind)
  )
    throw new Error("장소, 참여 방식과 오늘까지의 날짜를 확인해 주세요.");
  return {
    placeId: value.placeId,
    date: value.date,
    kind: value.kind,
    method:
      value.method === "nearby" && ["visit", "festival"].includes(value.kind)
        ? "nearby"
        : "self",
    recordedAt:
      Number.isSafeInteger(value.recordedAt) &&
      value.recordedAt > 0 &&
      value.recordedAt <= now
        ? value.recordedAt
        : now,
  };
}
export const PASSPORT_KINDS = {
  visit: "나의 방문 기록",
  festival: "축제 참여 기록",
  story: "음성·글로 만난 풍경",
  observation: "현장 정보를 살핀 여행",
};
