/**
 * 안내견 동반 상태 문구(스펙 20).
 *
 * `KorWithService2/detailWithTour2`의 `helpdog` 필드는 이미 `FACILITIES`와
 * `profileFields`에 연동돼 있다. 이 모듈은 화면에 쓰는 세 상태 문구를 한
 * 곳에 고정해 둔다. 안내견 동반은 법으로 보장되는 권리이므로 "동반 불가"라고
 * 단정하지 않는다: 등록 정보가 없거나 부재로 등록된 것뿐이지 거부가
 * 정당하다는 뜻이 아니다.
 *
 * 이 모듈은 순수 문구만 담는다. 네트워크·저장소·위치 API를 참조하지 않는다.
 */

/** @typedef {'confirmed' | 'unknown' | 'negative'} GuideDogState */

/** @type {Record<GuideDogState, { ko: string; en: string }>} */
export const GUIDE_DOG_STATE_TEXT = Object.freeze({
  confirmed: {
    ko: "안내견 동반이 등록돼 있어요.",
    en: "Guide dog access is registered.",
  },
  negative: {
    ko: "안내견 동반이 없다고 등록돼 있어요. 등록 내용과 실제 응대가 다를 수 있어요.",
    en: "It is registered as not offering guide dog access. The actual response on site may differ from this record.",
  },
  unknown: {
    ko: "안내견 동반 정보가 등록돼 있지 않아요.",
    en: "No guide dog access information is registered.",
  },
});

/** negative·unknown 아래 항상 붙는 법 안내 한 줄. 법 조항 번호나 처벌 규정은 적지 않는다. */
export const GUIDE_DOG_LEGAL_NOTE = Object.freeze({
  ko: "장애인 보조견 동반은 법으로 보장돼 있어요. 방문 전에 확인하면 더 편해요.",
  en: "Bringing an assistance dog is a legal right. Checking ahead of your visit can help.",
});

/** @param {string} state @param {boolean} [en] @returns {string} */
export function guideDogStateText(state, en = false) {
  const entry = GUIDE_DOG_STATE_TEXT[/** @type {GuideDogState} */ (state)] || GUIDE_DOG_STATE_TEXT.unknown;
  return en ? entry.en : entry.ko;
}

/** @param {boolean} [en] @returns {string} */
export function guideDogLegalNote(en = false) {
  return en ? GUIDE_DOG_LEGAL_NOTE.en : GUIDE_DOG_LEGAL_NOTE.ko;
}
