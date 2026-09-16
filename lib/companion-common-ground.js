import { FACILITIES, resolveFacilityKeys } from './facility-selection.js';

const labelByKey = new Map(FACILITIES.map(item => [item.key, item.label]));

export function sanitizeCompanions(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item, index) => ({
    id: typeof item?.id === 'string' && /^[a-zA-Z0-9_-]{1,24}$/.test(item.id) ? item.id : `companion-${index + 1}`,
    name: typeof item?.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 20) : `동행자 ${index + 1}`,
    facilities: resolveFacilityKeys({ facilityKeys: item?.facilities }),
    maxWalkMinutes: Number.isInteger(item?.maxWalkMinutes) && item.maxWalkMinutes >= 5 && item.maxWalkMinutes <= 180 ? item.maxWalkMinutes : null,
  }));
}

export function companionCommonGround(companions, places = []) {
  const members = sanitizeCompanions(companions);
  const requirements = [...new Set(members.flatMap(member => member.facilities))].map(key => ({
    key,
    label: labelByKey.get(key) || key,
    members: members.filter(member => member.facilities.includes(key)).map(member => member.name),
  }));
  const strictestWalkMinutes = members.map(member => member.maxWalkMinutes).filter(Number.isInteger).sort((a, b) => a - b)[0] || null;
  const evaluations = (Array.isArray(places) ? places : []).slice(0, 24).map(place => {
    const fields = new Map((Array.isArray(place?.accessibility) ? place.accessibility : []).map(field => [field.key, field.state]));
    const memberResults = members.map(member => {
      const negative = member.facilities.filter(key => fields.get(key) === 'negative');
      const unknown = member.facilities.filter(key => !fields.has(key) || fields.get(key) === 'unknown');
      return { id: member.id, name: member.name, state: negative.length ? 'blocked' : unknown.length ? 'unknown' : 'common', negative, unknown };
    });
    const state = memberResults.some(item => item.state === 'blocked') ? 'blocked' : memberResults.some(item => item.state === 'unknown') ? 'unknown' : 'common';
    return { placeId: String(place?.id || ''), name: String(place?.name || ''), state, members: memberResults };
  });
  return { members, requirements, strictestWalkMinutes, evaluations, hasNeeds: requirements.length > 0 || strictestWalkMinutes !== null };
}
