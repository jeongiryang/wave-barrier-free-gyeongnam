const REGIONS = ['경남 전체','창원','진주','통영','사천','김해','밀양','거제','양산','의령','함안','창녕','고성','남해','하동','산청','함양','거창','합천'];
const text = (value, max) => typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : '';
const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number), date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
const validTime = value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
export function sanitizePhotoTripFacts(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).map(item => ({
    name: text(item?.name, 80), region: REGIONS.includes(text(item?.region, 12)) ? text(item.region, 12) : '',
    date: validDate(item?.date) ? item.date : '', startTime: validTime(item?.startTime) ? item.startTime : '', endTime: validTime(item?.endTime) ? item.endTime : '', address: text(item?.address, 140),
  })).filter(item => item.name || item.date || item.address);
}
const normalized = value => String(value || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
export function verifyPhotoTripFacts(facts, places) {
  const safe = sanitizePhotoTripFacts(facts);
  const candidates = Array.isArray(places) ? places : [];
  return safe.map(fact => {
    const matches = candidates.filter(place => normalized(place?.name) === normalized(fact.name) && (!fact.region || fact.region === '경남 전체' || String(place?.city || '').includes(fact.region)));
    const dated = matches.filter(place => !fact.date || ((!place.startDate || fact.date >= place.startDate) && (!place.endDate || fact.date <= place.endDate)));
    const exact = dated.length === 1 ? dated[0] : null;
    return { fact, state: exact ? 'verified' : matches.length > 1 || dated.length > 1 ? 'ambiguous' : 'not-found', place: exact };
  });
}
