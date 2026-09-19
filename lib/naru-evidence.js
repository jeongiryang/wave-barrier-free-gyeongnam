/**
 * 나루가 장소 목록을 돌려줄 때 "몇 곳"이 아니라 "무엇이 확인됐고 무엇이
 * 확인되지 않았는지"를 먼저 말하게 하는 순수 계산이다.
 *
 * 숫자와 상태는 전부 여기에서 나온다. 모델 출력에서 개수나 상태를 읽지
 * 않는다. 상태 판정은 lib/accessibility-score.js의 accessibilityFieldState를
 * 그대로 쓰고 새 규칙을 만들지 않는다. 미확인(unknown)과 명시적 부재
 * (negative)는 끝까지 구분한다. 제공처가 값을 주지 않은 것은 시설이 없다는
 * 근거가 아니기 때문이다.
 *
 * 시간·무작위값·네트워크·저장소·위치 API를 쓰지 않는다.
 */
import { FACILITIES, facilityLabel } from './facility-selection.js';
import { accessibilityFieldState } from './accessibility-score.js';

const allowed = new Set(FACILITIES.map(item => item.key));
const STATES = ['confirmed', 'unknown', 'negative'];

/** 사용자가 고른 순서를 지키면서 실제 존재하는 편의 키만 남긴다. */
function usableKeys(facilityKeys) {
  return [...new Set(Array.isArray(facilityKeys) ? facilityKeys.filter(key => typeof key === 'string' && allowed.has(key)) : [])];
}

function entriesOf(place) {
  return Array.isArray(place?.accessibility) ? place.accessibility : [];
}

/**
 * 한 장소에서 한 편의의 상태를 읽는다. 항목이 없으면 미확인이며 없음이 아니다.
 * @returns {'confirmed'|'unknown'|'negative'}
 */
export function placeFacilityState(place, facilityKey) {
  const entry = entriesOf(place).find(item => item?.key === facilityKey);
  if (!entry) return 'unknown';
  if (STATES.includes(entry.state)) return entry.state;
  return accessibilityFieldState(entry.detail);
}

/** 편의 정보를 한 항목이라도 들고 있는 응답인지 본다. 없으면 요약을 그리지 않는다. */
export function hasAccessibilityEvidence(places) {
  return (Array.isArray(places) ? places : []).some(place => entriesOf(place).length > 0);
}

/**
 * 가장 적게 확인된 편의를 기준으로 고른다. 가장 약한 고리가 실제 제약이다.
 * 동점이면 사용자가 먼저 고른 것을 쓴다. 같은 입력에 항상 같은 결과를 낸다.
 * @returns {string | null}
 */
export function weakestFacility(places, facilityKeys) {
  const keys = usableKeys(facilityKeys);
  const list = Array.isArray(places) ? places : [];
  if (!keys.length || !hasAccessibilityEvidence(list)) return null;
  let chosen = null;
  let fewest = Infinity;
  for (const key of keys) {
    const confirmed = list.reduce((sum, place) => sum + (placeFacilityState(place, key) === 'confirmed' ? 1 : 0), 0);
    if (confirmed < fewest) { fewest = confirmed; chosen = key; }
  }
  return chosen;
}

/** 확인·미확인·부재를 센다. 세 값의 합은 언제나 전체와 같다. */
export function tallyEvidence(places, facilityKey) {
  const list = Array.isArray(places) ? places : [];
  const counts = { confirmed: 0, unknown: 0, negative: 0 };
  for (const place of list) counts[placeFacilityState(place, facilityKey)] += 1;
  return { facilityKey, label: facilityLabel(facilityKey), total: list.length, ...counts };
}

/**
 * 확인된 곳과 그렇지 않은 곳으로 나눈다. 정보가 없는 곳을 목록에서 빼지
 * 않는다. 담을지는 사용자가 판단한다. unknown과 negative를 하나로 뭉개지
 * 않고 각 항목의 상태는 placeFacilityState로 그대로 읽을 수 있다.
 */
export function groupByEvidence(places, facilityKey) {
  const list = Array.isArray(places) ? places : [];
  return {
    confirmed: list.filter(place => placeFacilityState(place, facilityKey) === 'confirmed'),
    unconfirmed: list.filter(place => placeFacilityState(place, facilityKey) !== 'confirmed'),
  };
}

/** 받침에 맞춰 주격 조사를 고른다. */
function subjectParticle(word) {
  const last = String(word || '').trim().slice(-1).charCodeAt(0);
  if (!(last >= 0xac00 && last <= 0xd7a3)) return '이';
  return (last - 0xac00) % 28 ? '이' : '가';
}

/** 미확인과 부재를 글자로 구분해 말한다. 확인된 곳이 0곳이면 그대로 말한다. */
export function missingPhrase(tally) {
  const unknown = Math.max(0, Number(tally?.unknown) || 0);
  const negative = Math.max(0, Number(tally?.negative) || 0);
  const label = String(tally?.label || '');
  if (negative && unknown) return `${unknown}곳은 정보가 등록돼 있지 않고 ${negative}곳은 ${label}${subjectParticle(label)} 없다고 적혀 있어요.`;
  if (negative) return `${negative}곳은 ${label}${subjectParticle(label)} 없다고 적혀 있어요.`;
  return `${unknown}곳은 정보가 등록돼 있지 않아요.`;
}

/**
 * 요약 한 줄. 숫자는 전부 tallyEvidence가 계산한 값이며 모델이 세지 않는다.
 * 확인된 곳이 없으면 숨기거나 돌려 말하지 않는다.
 */
export function evidenceSentence(tally, region) {
  const label = String(tally?.label || '');
  const where = String(region || '').trim() || '경남 전체';
  const total = Math.max(0, Number(tally?.total) || 0);
  const confirmed = Math.max(0, Number(tally?.confirmed) || 0);
  const head = `${where}에서 ${total}곳을 봤어요.`;
  const particle = subjectParticle(label);
  const unknown = Math.max(0, Number(tally?.unknown) || 0);
  const negative = Math.max(0, Number(tally?.negative) || 0);
  if (!confirmed) {
    const all = !negative ? `${total}곳 모두 정보가 등록돼 있지 않아요.`
      : !unknown ? `${total}곳 모두 ${label}${particle} 없다고 적혀 있어요.`
        : missingPhrase(tally);
    return `${head} ${label}${particle} 확인된 곳은 없어요. ${all}`;
  }
  if (confirmed === total) return `${head} ${total}곳 모두 ${label}${particle} 확인됐어요.`;
  const rest = missingPhrase(tally);
  return `${head} ${label}${particle} 확인된 곳은 ${confirmed}곳이고, ${negative ? rest : `나머지 ${rest}`}`;
}

/** 묶음 제목. 배지를 만들지 않고 개수를 글자로 적는다. */
export function evidenceGroupTitle(kind, count) {
  return `${kind === 'confirmed' ? '확인된 곳' : '정보가 없는 곳'} ${Math.max(0, Number(count) || 0)}곳`;
}

/** 상태를 색이 아니라 글자로 구분한다. */
export function evidenceStateText(state, label) {
  const name = String(label || '');
  if (state === 'confirmed') return `${name} 확인`;
  if (state === 'negative') return `${name} 없음`;
  return `${name} 정보 없음`;
}
