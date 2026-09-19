/**
 * 점자블록 상태 문구(스펙 14).
 *
 * `KorWithService2/detailWithTour2`의 `braileblock` 필드는 이미 `FACILITIES`와
 * `profileFields`에 연동돼 있다. 이 모듈은 화면에 쓰는 세 상태 문구를 한 곳에
 * 고정해 둔다. 미확인을 없음으로 표시하지 않으며, 이 정보가 관광지 단위로
 * 등록된 것이지 주변 보도 전체를 조사한 결과가 아니라는 점을 항상 함께 알린다.
 *
 * 이 모듈은 순수 문구만 담는다. 네트워크·저장소·위치 API를 참조하지 않는다.
 */

/** @typedef {'confirmed' | 'unknown' | 'negative'} TactilePavingState */

/** @type {Record<TactilePavingState, { ko: string; en: string }>} */
export const TACTILE_PAVING_STATE_TEXT = Object.freeze({
  confirmed: {
    ko: "점자블록 있음",
    en: "Tactile paving present",
  },
  negative: {
    ko: "점자블록 없음",
    en: "Tactile paving not present",
  },
  unknown: {
    ko: "점자블록 정보 없음",
    en: "No tactile paving information",
  },
});

/** 상태와 무관하게 항상 함께 두는 문구. 관광지 단위 등록 정보임을 알리고 주변
 * 보도까지 확인된 것으로 오해하지 않게 한다. */
export const TACTILE_PAVING_SCOPE_NOTE = Object.freeze({
  ko: "관광지에 등록된 정보예요. 주변 보도의 점자블록은 확인되지 않았어요.",
  en: "This is information registered for the attraction. Tactile paving on nearby sidewalks has not been checked.",
});

/** @param {string} [state] @param {boolean} [en] @returns {string} */
export function tactilePavingStateText(state, en = false) {
  const entry = TACTILE_PAVING_STATE_TEXT[/** @type {TactilePavingState} */ (state)] || TACTILE_PAVING_STATE_TEXT.unknown;
  return en ? entry.en : entry.ko;
}

/** @param {boolean} [en] @returns {string} */
export function tactilePavingScopeNote(en = false) {
  return en ? TACTILE_PAVING_SCOPE_NOTE.en : TACTILE_PAVING_SCOPE_NOTE.ko;
}
