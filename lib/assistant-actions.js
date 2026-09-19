/**
 * ASSISTANT_ACTIONS 또는 ASSISTANT_TOOLS에 새 값을 추가하려면 아래 7개
 * 조건을 모두 만족해야 한다(명세 19, docs/naru-service.md에도 기록):
 *
 * 1. 되돌릴 수 있다. 적용한 뒤 사용자가 되돌릴 수 없는 동작은 추가하지 않는다.
 * 2. 화면에 이미 있다. 사용자가 직접 눌러서도 할 수 있는 일이어야 한다.
 *    나루만 할 수 있는 일을 만들지 않는다.
 * 3. 매개변수가 닫혀 있다. 모든 값이 정해진 목록, 숫자 범위, 또는 호출자가
 *    보낸 id 목록 안에서 검증된다. 자유 문자열을 그대로 쓰지 않는다.
 * 4. 위치가 필요 없다.
 * 5. 바깥으로 나가지 않는다. 임의 URL 열기, 외부 요청, 파일 쓰기, 결제,
 *    메시지 전송을 하지 않는다.
 * 6. 검증 함수가 있다. validateAssistantAction에 그 동작의 분기와 단위
 *    테스트가 함께 추가된다.
 * 7. 실패해도 안전하다. 검증에 실패하면 제안 전체가 버려지고 대화만 남는다.
 *
 * 하나라도 만족하지 못하면 화이트리스트에 넣지 않는다. 대신 12번 명세의
 * 도움 모음(lib/naru-hub.js)처럼 사용자가 직접 누르는 진입으로 만든다.
 * validateAssistantAction은 항상 화이트리스트로 값을 "다시 만드는" 방식을
 * 유지한다. 입력을 그대로 통과시키거나 부분적으로 허용하지 않는다.
 */
import { FACILITIES } from './facility-selection.js';
import { isChangeNegated } from './assistant-conversation.js';
import { groundAssistantProposal } from './assistant-grounding.js';
export const ASSISTANT_TOOLS = ['conditions', 'facilities', 'dates', 'places', 'itinerary', 'receipt', 'map', 'readiness', 'weather', 'transport', 'alternatives', 'comfort', 'budget', 'save', 'share', 'offline', 'calendar', 'on-trip', 'inquiry', 'preview', 'transcript', 'compare', 'course', 'split'];
import { validTripDate, boundedTripEnd } from './trip-dates.js';
export const ASSISTANT_ACTIONS = ['create-itinerary', 'adapt-itinerary', 'set-dates', 'recalculate-route', 'save-trip', 'settings', 'search', 'add', 'remove', 'details', 'move', 'visit', 'break', 'day', 'start-time', 'deadline', 'readiness', 'compare', 'alternatives', 'next', 'undo', 'tool', 'help'];
const regions = ['경남 전체','창원','진주','통영','사천','김해','밀양','거제','양산','의령','함안','창녕','고성','남해','하동','산청','함양','거창','합천'];
const profiles = [...FACILITIES.map(item => item.key), 'wheel','senior','baby','pregnant','visual','hearing'];
const themes = ['nature','history','leisure','food'];

/** Model output never authorizes arbitrary URLs, code, tools or place IDs. */
export function validateAssistantAction(value, placeIds = []) {
  if (!value || typeof value !== 'object' || !ASSISTANT_ACTIONS.includes(value.action)) return null;
  const result = { action: value.action };
  if (['settings', 'create-itinerary', 'adapt-itinerary'].includes(value.action)) {
    if (value.region !== undefined) { if (!regions.includes(value.region)) return null; result.region = value.region; }
    for (const [key, allowed] of [['profiles',profiles],['themes',themes]]) {
      if (value[key] !== undefined) {
        if (!Array.isArray(value[key]) || !value[key].length || value[key].some(id => !allowed.includes(id))) return null;
        result[key] = [...new Set(value[key])];
      }
    }
    if (value.count !== undefined) { if (!Number.isInteger(value.count) || value.count < 1 || value.count > 12) return null; result.count = value.count; }
    // Date changes use the existing calendar validation and preserve existing assignments.
    if (value.action === 'settings' && Object.keys(result).length === 1) return null;
  }
  if (['create-itinerary', 'adapt-itinerary', 'set-dates'].includes(value.action)) {
    if (value.start !== undefined || value.end !== undefined || value.action === 'set-dates') {
      if (!validTripDate(value.start) || (value.end !== undefined && (!validTripDate(value.end) || boundedTripEnd(value.start, value.end) !== value.end))) return null;
      result.start = value.start; result.end = value.end || value.start;
    }
    if (value.date !== undefined) { if (!validTripDate(value.date)) return null; result.date = value.date; }
    if (value.indoor !== undefined) { if (typeof value.indoor !== 'boolean') return null; result.indoor = value.indoor; }
    if (value.pace !== undefined) { if (!['relaxed', 'standard'].includes(value.pace)) return null; result.pace = value.pace; }
    if (value.originRegion !== undefined) { if (!regions.includes(value.originRegion) || value.originRegion === '경남 전체') return null; result.originRegion = value.originRegion; }
    if (value.festival !== undefined) { if (typeof value.festival !== 'string' || value.festival.length > 100) return null; result.festival = value.festival.trim(); }
    if (value.reason !== undefined) { if (!['rain', 'fatigue', 'change', 'closed'].includes(value.reason)) return null; result.reason = value.reason; }
  }
  if (['create-itinerary', 'adapt-itinerary', 'set-dates', 'recalculate-route'].includes(value.action) && value.transport !== undefined) {
    if (!['walk', 'bicycle', 'transit', 'car'].includes(value.transport)) return null;
    result.transport = value.transport;
  }
  if (['add','remove','details','move','visit','break','alternatives'].includes(value.action)) {
    if (typeof value.placeId !== 'string' || !placeIds.includes(value.placeId)) return null;
    result.placeId = value.placeId;
  }
  if (['visit','break'].includes(value.action)) {
    if (!Number.isInteger(value.minutes) || value.minutes < (value.action === 'visit' ? 15 : 0) || value.minutes > (value.action === 'visit' ? 720 : 120)) return null;
    result.minutes = value.minutes;
    if (value.action === 'break' && ['nap','nursing'].includes(value.purpose)) result.purpose = value.purpose;
  }
  if (value.action === 'move') { if (!['up','down'].includes(value.direction)) return null; result.direction = value.direction; }
  if (value.action === 'day') { if (!validTripDate(value.date)) return null; result.date = value.date; }
  if (['start-time','deadline'].includes(value.action)) { if (typeof value.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) return null; result.time = value.time; }
  if (value.action === 'tool') { if (!ASSISTANT_TOOLS.includes(value.tool)) return null; result.tool = value.tool; }
  return result;
}

/** A small, explicitly labelled offline command fallback; never presented as LLM reasoning. */
export function localAssistantAction(text, places = []) {
  const value = String(text || '').trim();
  if (isChangeNegated(value)) return { action: 'help' };
  const place = places.filter(p => value.includes(p.name));
  if (place.length === 1) {
    const action = /빼|제거|삭제/.test(value) ? 'remove' : /담|추가|넣/.test(value) ? 'add' : /정보|알려|보여/.test(value) ? 'details' : null;
    if (action) return { action, placeId: place[0].id };
  }
  if (/되돌/.test(value)) return { action: 'undo' };
  if (/출발 전|준비.*확인|준비.*알려/.test(value)) return { action: 'readiness' };
  if (/다음.*(장소|어디)/.test(value)) return { action: 'next' };
  if (/왜.*(?:일정|장소)|(?:선정|추천).*(?:근거|이유)|결정.*영수증/.test(value)) return { action: 'tool', tool: 'receipt' };
  const selectedRegion = regions.find(region => value.includes(region));
  if (selectedRegion) {
    // The fallback must honour the same current-turn region/count constraints
    // as a connected model, rather than the first city in the region catalog.
    const grounded = groundAssistantProposal({ action: 'settings', region: selectedRegion }, [{ role: 'user', content: value }], {});
    return grounded?.action === 'settings' ? validateAssistantAction(grounded) || { action: 'help' } : { action: 'help' };
  }
  if (/여행지.*(찾|검색)|검색해/.test(value)) return { action: 'search' };
  const tools = [['날씨','weather'],['지도','map'],['편의','facilities'],['날짜','dates'],['예산','budget'],['저장','save'],['공유','share'],['오프라인','offline'],['교통','transport'],['일정','itinerary']];
  const tool = tools.find(([word]) => value.includes(word));
  return tool ? { action: 'tool', tool: tool[1] } : { action: 'help' };
}
