/** Canonical selectable facilities. Labels describe facilities, never a traveller's health. */
export const FACILITIES = [
  { key: 'route', label: '접근로', en: 'Access path' },
  { key: 'elevator', label: '승강기', en: 'Lift' },
  { key: 'restroom', label: '장애인 화장실', en: 'Accessible toilet' },
  { key: 'parking', label: '장애인 주차구역', en: 'Accessible parking' },
  { key: 'wheelchair', label: '휠체어 대여', en: 'Wheelchair rental' },
  { key: 'stroller', label: '유모차 대여', en: 'Stroller rental' },
  { key: 'lactationroom', label: '수유실', en: 'Nursing room' },
  { key: 'babysparechair', label: '유아용 의자', en: 'High chair' },
  { key: 'braileblock', label: '점자블록', en: 'Tactile paving' },
  { key: 'helpdog', label: '안내견 동반', en: 'Guide dog access' },
  { key: 'guidehuman', label: '안내요원', en: 'Assistance staff' },
  { key: 'audioguide', label: '음성 안내', en: 'Audio guide' },
  { key: 'bigprint', label: '큰 글자 안내', en: 'Large print' },
  { key: 'signguide', label: '수어 안내', en: 'Sign language guide' },
  { key: 'videoguide', label: '영상 안내', en: 'Video guide' },
  { key: 'hearingroom', label: '청각 지원 객실', en: 'Hearing support room' },
];
export const LEGACY_FACILITY_GROUPS = {
  wheel: ['parking', 'route', 'wheelchair', 'elevator', 'restroom'],
  senior: ['route', 'elevator', 'restroom'],
  baby: ['stroller', 'lactationroom', 'babysparechair'],
  pregnant: ['elevator', 'restroom', 'route'],
  visual: ['braileblock', 'helpdog', 'guidehuman', 'audioguide', 'bigprint'],
  hearing: ['signguide', 'videoguide', 'hearingroom'],
};
const legacyLabels = { wheelchair: 'wheelchair', '휠체어 이용': 'wheel', '걷기 불편': 'senior', '휠체어 편의시설': 'wheel', '접근로와 승강기': 'senior', '유아 편의시설': 'baby', '화장실과 실내 이동': 'pregnant', '시각 정보 지원': 'visual', '청각 정보 지원': 'hearing' };
const allowed = new Set(FACILITIES.map(item => item.key));
const labels = new Map(FACILITIES.map(item => [item.label, item.key]));
const values = input => Array.isArray(input) ? input : typeof input === 'string' ? input.split(',') : [];
export function resolveFacilityKeys(input = {}) {
  if (!input || typeof input !== 'object') return [];
  const explicit = Object.hasOwn(input, 'facilityKeys');
  const candidates = values(explicit ? input.facilityKeys : input.profiles).flatMap(value => {
    if (typeof value !== 'string') return [];
    const key = value.trim();
    if (allowed.has(key)) return [key];
    if (explicit) return [];
    if (labels.has(key)) return [labels.get(key)];
    return LEGACY_FACILITY_GROUPS[legacyLabels[key] || key] || [];
  });
  return [...new Set(candidates)].filter(key => allowed.has(key));
}
export function classifyFacilities(place, requiredKeys) {
  const required = resolveFacilityKeys({ facilityKeys: requiredKeys });
  if (!required.length) return 'match';
  const entries = Array.isArray(place?.accessibility) ? place.accessibility : [];
  if (entries.some(item => required.includes(item?.key) && item.state === 'negative')) return 'absent';
  return required.every(key => entries.some(item => item?.key === key && item.state === 'confirmed')) ? 'match' : 'unknown';
}
export function facilityLabel(key, en = false) { const item = FACILITIES.find(item => item.key === key); return item ? en ? item.en : item.label : key; }

/** Read only explicitly requested facilities; a companion or diagnosis is not a facility. */
export function spokenFacilityKeys(text) {
  const spoken = FACILITIES.filter(facility => {
    const at = text.indexOf(facility.label);
    return at >= 0 && !/^(?:은|는|이|가|을|를)?\s*(?:빼|제외|없이|말고|필요\s*없|없어도|없어야|없는)/.test(text.slice(at + facility.label.length));
  }).map(item => item.key);
  if (/휠체어.{0,8}(?:갈\s*수|접근)|계단.{0,8}(?:피하|피해|없이)/.test(text)) spoken.push('route');
  return resolveFacilityKeys({ facilityKeys: spoken });
}
