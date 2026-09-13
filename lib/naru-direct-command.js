import { isChangeNegated } from './assistant-conversation.js';
const clockPattern = /(오전|오후)?\s*(\d{1,2})\s*(?::|시)\s*(\d{1,2})?\s*분?/g;

export function naruEditClarification(text) {
  const value = String(text || '');
  if (/되돌|실행\s*취소/.test(value) && /바꿔|변경해|설정해|정해|넣어|추가해|빼줘|빼\s*주세요|삭제해|옮겨|담아/.test(value))
    return '되돌리기와 다른 변경은 하나씩 처리할게요. 먼저 할 작업을 알려주세요. 예: 마지막 변경 되돌려줘';
  if (!/바꿔|변경|설정|정해/.test(value)) return null;
  if (/출발|시작|귀가|돌아|마감/.test(value) && ([...value.matchAll(clockPattern)].length > 1 || /출발|시작/.test(value) && /귀가|돌아|마감/.test(value)))
    return '출발 시각이나 귀가 마감 중 하나를 먼저 알려주세요. 예: 출발 시각을 오전 11시로 바꿔줘';
  if (/휴식|쉬는|낮잠|수유/.test(value) && /체류|머무/.test(value) && [...value.matchAll(/\d+\s*분/g)].length > 1)
    return '머무는 시간과 쉬는 시간 중 하나를 먼저 알려주세요.';
  return null;
}

/** Only explicit, reversible edits. Ambiguous language still goes through Naru. */
export function naruDirectCommand(text, places = []) {
  const value = String(text || '').trim();
  if (/^(?:(?:마지막|방금)(?:\s*(?:변경|작업|수정))?\s*)?(?:되돌려\s*(?:줘|주세요)|되돌리기|실행\s*취소)(?:해\s*(?:줘|주세요))?[.!]?$/u.test(value)) return { action: 'undo' };
  if (isChangeNegated(value) || naruEditClarification(value)) return null;
  const matches = places.filter(place => value.includes(place.name));
  const durations = [...value.matchAll(/(\d{1,3})\s*분/g)];
  if (durations.length > 1 || /체류|머무/.test(value) && /휴식|낮잠|수유/.test(value)) return null;
  const duration = durations[0];
  if (matches.length === 1 && duration && /넣|추가|바꿔|변경|설정|정해/.test(value)) {
    const minutes = Number(duration[1]);
    if (/휴식|쉬는|쉬어|낮잠|수유/.test(value) && minutes >= 0 && minutes <= 120)
      return { action: 'break', placeId: matches[0].id, minutes, ...(/낮잠/.test(value) ? { purpose: 'nap' } : /수유/.test(value) ? { purpose: 'nursing' } : {}) };
    if (/머무|체류|둘러/.test(value) && minutes >= 15 && minutes <= 720)
      return { action: 'visit', placeId: matches[0].id, minutes };
  }
  const clocks = [...value.matchAll(clockPattern)];
  const clock = clocks.length === 1 ? clocks[0] : null;
  if (clock && /정해|설정|바꿔|변경/.test(value)) {
    let hour = Number(clock[2]); const minute = Number(clock[3] || 0);
    if (clock[1] && (hour < 1 || hour > 12)) return null;
    if (clock[1]) hour = hour % 12 + (clock[1] === '오후' ? 12 : 0);
    if (hour > 23 || minute > 59) return null;
    const action = /귀가|돌아|마감/.test(value) ? 'deadline' : /출발|시작/.test(value) ? 'start-time' : null;
    if (action) return { action, time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
  }
  return null;
}
