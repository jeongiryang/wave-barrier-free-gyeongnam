export const ASSISTANT_TOOLS = ['conditions', 'facilities', 'dates', 'places', 'itinerary', 'map', 'readiness', 'weather', 'transport', 'alternatives', 'comfort', 'budget', 'share', 'offline', 'calendar', 'on-trip', 'inquiry', 'compare', 'course', 'split'];
export const ASSISTANT_ACTIONS = ['settings', 'search', 'add', 'remove', 'details', 'move', 'visit', 'break', 'day', 'start-time', 'deadline', 'readiness', 'compare', 'alternatives', 'next', 'undo', 'tool', 'help'];
const regions = ['경남 전체','창원','진주','통영','사천','김해','밀양','거제','양산','의령','함안','창녕','고성','남해','하동','산청','함양','거창','합천'];
const profiles = ['wheel','senior','baby','pregnant','visual','hearing'];
const themes = ['nature','history','leisure','food'];

/** Model output never authorizes arbitrary URLs, code, tools or place IDs. */
export function validateAssistantAction(value, placeIds = []) {
  if (!value || typeof value !== 'object' || !ASSISTANT_ACTIONS.includes(value.action)) return null;
  const result = { action: value.action };
  if (value.action === 'settings') {
    if (value.region !== undefined) { if (!regions.includes(value.region)) return null; result.region = value.region; }
    for (const [key, allowed] of [['profiles',profiles],['themes',themes]]) {
      if (value[key] !== undefined) {
        if (!Array.isArray(value[key]) || !value[key].length || value[key].some(id => !allowed.includes(id))) return null;
        result[key] = [...new Set(value[key])];
      }
    }
    // Date changes use the existing calendar validation and preserve existing assignments.
    if (Object.keys(result).length === 1) return null;
  }
  if (['add','remove','details','move','visit','break','alternatives'].includes(value.action)) {
    if (typeof value.placeId !== 'string' || !placeIds.includes(value.placeId)) return null;
    result.placeId = value.placeId;
  }
  if (['visit','break'].includes(value.action)) {
    if (!Number.isInteger(value.minutes) || value.minutes < (value.action === 'visit' ? 15 : 0) || value.minutes > (value.action === 'visit' ? 720 : 180)) return null;
    result.minutes = value.minutes;
  }
  if (value.action === 'move') { if (!['up','down'].includes(value.direction)) return null; result.direction = value.direction; }
  if (value.action === 'day') { if (typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.date)) return null; result.date = value.date; }
  if (['start-time','deadline'].includes(value.action)) { if (typeof value.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) return null; result.time = value.time; }
  if (value.action === 'tool') { if (!ASSISTANT_TOOLS.includes(value.tool)) return null; result.tool = value.tool; }
  return result;
}

/** A small, explicitly labelled offline command fallback; never presented as LLM reasoning. */
export function localAssistantAction(text, places = []) {
  const value = String(text || '').trim();
  const place = places.filter(p => value.includes(p.name));
  if (place.length === 1) {
    const action = /빼|제거|삭제/.test(value) ? 'remove' : /담|추가|넣/.test(value) ? 'add' : /정보|알려|보여/.test(value) ? 'details' : null;
    if (action) return { action, placeId: place[0].id };
  }
  if (/되돌/.test(value)) return { action: 'undo' };
  if (/출발 전|준비.*확인|준비.*알려/.test(value)) return { action: 'readiness' };
  if (/다음.*(장소|어디)/.test(value)) return { action: 'next' };
  const selectedRegion = regions.find(region => value.includes(region));
  if (selectedRegion) return { action: 'settings', region: selectedRegion };
  if (/여행지.*(찾|검색)|검색해/.test(value)) return { action: 'search' };
  const tools = [['날씨','weather'],['지도','map'],['편의','facilities'],['날짜','dates'],['예산','budget'],['공유','share'],['오프라인','offline'],['교통','transport'],['일정','itinerary']];
  const tool = tools.find(([word]) => value.includes(word));
  return tool ? { action: 'tool', tool: tool[1] } : { action: 'help' };
}
