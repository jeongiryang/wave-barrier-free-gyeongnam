/**
 * 익명으로 열려 있는 저장 경로(`POST /api/trips`, `POST /api/feedback`)의 쓰기 예산.
 *
 * 두 경로는 로그인 없이 쓰도록 설계된 기능이라 커뮤니티처럼 작성자별 제한을
 * 걸 수 없다. 대신 저장소 전체의 최근 쓰기량을 두 구간으로 나눠 본다.
 * 짧은 구간은 순간적인 자동 요청을, 긴 구간은 꾸준히 밀어 넣는 요청을 막는다.
 *
 * IP나 그 해시를 남기지 않는다. 개인을 식별하지 않고도 저장 용량을 지키는 것이
 * 이 함수의 목표이며, 그 대가로 한 사람이 창을 채우면 잠시 저장이 막힌다.
 */
export const TRIP_WRITE_BUDGET = {
  burst: { windowMs: 60_000, max: 20 },
  sustained: { windowMs: 600_000, max: 90 },
};

export const FEEDBACK_WRITE_BUDGET = {
  burst: { windowMs: 60_000, max: 10 },
  sustained: { windowMs: 600_000, max: 45 },
};

/** 저장을 막아야 하면 걸린 구간 이름을, 여유가 있으면 빈 문자열을 돌려준다. */
export function exceededWriteWindow(budget, counts) {
  const burst = Number(counts?.burst ?? 0);
  const sustained = Number(counts?.sustained ?? 0);
  if (Number.isFinite(burst) && burst >= budget.burst.max) return "burst";
  if (Number.isFinite(sustained) && sustained >= budget.sustained.max) return "sustained";
  return "";
}

/** 429 응답에 쓸 재시도 안내 초. 걸린 구간의 길이를 그대로 알려 준다. */
export function retryAfterSeconds(budget, window) {
  const windowMs = window === "burst" ? budget.burst.windowMs : budget.sustained.windowMs;
  return Math.ceil(windowMs / 1000);
}
