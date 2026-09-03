/**
 * 만료된 공유 여행을 지우는 양.
 *
 * 정리는 두 곳에서 돈다. 하나는 매일 도는 예약 작업이고, 다른 하나는 사용자의
 * 저장 요청에 얹힌 정리다. 뒤쪽은 사람이 응답을 기다리는 경로이므로 한 번에
 * 지우는 양을 반드시 묶어야 한다. 묶지 않으면 예약 작업이 며칠 밀렸을 때
 * 운 나쁜 사용자 한 명의 "여행 공유"가 그 청소를 통째로 떠안는다.
 */

/** 사용자 응답을 기다리게 하지 않을 만큼만 지운다. */
export const SAVE_PATH_SWEEP_LIMIT = 20;

/** 예약 작업은 넉넉히 지우되 한 문장이 무한정 길어지지 않게 한다. */
export const SCHEDULED_SWEEP_LIMIT = 5_000;

/** 로그인 없이 남긴 장소 편의 제보는 처리와 품질 개선에 필요한 기간만 보관한다. */
export const FEEDBACK_RETENTION_MS = 365 * 24 * 60 * 60 * 1_000;

/**
 * @param {"save" | "cron"} trigger
 * @returns {number}
 */
export function sweepLimitFor(trigger) {
  return trigger === "save" ? SAVE_PATH_SWEEP_LIMIT : SCHEDULED_SWEEP_LIMIT;
}
