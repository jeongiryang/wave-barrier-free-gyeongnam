import { spokenFacilityKeys } from './facility-selection.js';
const noChange = /(?:하지\s*마|하지\s*말|지\s*마(?:세요)?|지\s*말|안\s*(?:빼|담|넣|바꾸|변경|삭제|옮|추가)|(?:바꾸|변경하|삭제하|옮기|추가하|넣|담|저장하|적용하)지\s*않|말고|취소해?\s*줘|(?:바꾸|빼|넣|삭제|옮기|추가).*(?:될까|되나요|어때|궁금|설명))/;
export function isChangeNegated(text) { const value = String(text || ''); return noChange.test(value) || /[?？]|안\s*(?:돼|되|됩)|금지|(?:할까|될까|되나요|까요|나요|어때|괜찮아|가능해|궁금|설명)[.!\s]*$/.test(value); }
export function acceptsPendingChange(text) { return /^(?:응|네|좋아|좋아요|그걸로\s*(?:해\s*줘|할게|하자)|그대로\s*(?:적용|해\s*줘)|적용\s*해\s*줘)[.!\s]*$/.test(text.trim()); }

/** References resolve only against the order actually shown in this conversation. */
export function resolveConversationReference(text, places = [], focusedId = '') {
  const named = places.filter(place => text.includes(place.name));
  if (named.length === 1) return { text, placeId: named[0].id };
  const ordinal = text.match(/(첫\s*번째|두\s*번째|세\s*번째|네\s*번째|다섯\s*번째|\d+\s*번째)/);
  if (ordinal) {
    const word = ordinal[1].replace(/\s/g, '');
    const index = ['첫번째','두번째','세번째','네번째','다섯번째'].indexOf(word);
    const place = places[index >= 0 ? index : Number.parseInt(word, 10) - 1];
    return place ? { text: text.replace(ordinal[0], place.name), placeId: place.id } : { text, unresolved: true };
  }
  if (/거기|그곳|그\s*장소/.test(text)) {
    const place = places.find(place => place.id === focusedId);
    return place ? { text: text.replace(/거기|그곳|그\s*장소/g, place.name), placeId: place.id } : { text, unresolved: true };
  }
  return { text };
}

export function canRunConversationAction(text, action, referenceId = '', places = []) {
  if (!action) return false;
  if (['search','details','readiness','compare','next','tool','help'].includes(action.action)) return true;
  if (isChangeNegated(text)) return false;
  if (action.action === 'save-trip') return /저장.*(?:해 *줘|하자|할게)|저장해/.test(text);
  if (['create-itinerary','adapt-itinerary'].includes(action.action)) return false;
  if (action.action === 'settings') return Boolean(
    action.region && text.includes(action.region) || spokenFacilityKeys(text).some(key => action.profiles?.includes(key))
    || action.themes?.length && /자연|공원|정원|숲|역사|문화|박물관|미술관|전시|레포츠|스포츠|음식|식당|먹거리/.test(text));
  if (action.action === 'undo') return /되돌|실행\s*취소/.test(text);
  if (action.placeId) {
    const place = places.find(place => place.id === action.placeId);
    return Boolean(place && (referenceId === place.id || text.includes(place.name)) && /담|추가|넣|빼|제거|삭제|옮|이동|바꿔|바꾸|변경|줄여|늘려|해\s*줘|설정/.test(text));
  }
  return /(?:바꿔|바꾸|변경|해\s*줘|설정|출발|귀가|여행할|갈게|가자)/.test(text);
}
