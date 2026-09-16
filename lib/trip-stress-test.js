export const STRESS_SCENARIOS = ['rain', 'closure', 'fatigue', 'route-loss'];

export function runTripStressTest(input = {}) {
  const places = Array.isArray(input.places) ? input.places.slice(0, 24) : [];
  const scenarios = [...new Set(Array.isArray(input.scenarios) ? input.scenarios : [])].filter(value => STRESS_SCENARIOS.includes(value));
  const required = Array.isArray(input.requiredKeys) ? input.requiredKeys : [];
  const walking = input.walkingByPlaceId && typeof input.walkingByPlaceId === 'object' ? input.walkingByPlaceId : {};
  const routeReady = input.routeReadyByPlaceId && typeof input.routeReadyByPlaceId === 'object' ? input.routeReadyByPlaceId : {};
  const target = places.find(place => place.id === input.closurePlaceId) || places[0];
  const findings = [];
  if (scenarios.includes('rain')) {
    const affected = places.filter(place => !/(실내|박물관|미술관|전시|아쿠아리움)/.test(`${place?.summary || ''} ${place?.details || ''}`));
    findings.push({ scenario: 'rain', level: affected.length ? 'check' : 'unknown', title: '비가 오는 경우', affectedIds: affected.map(place => place.id), action: affected.length ? '대체 장소 비교' : '실내 여부 확인', reason: affected.length ? `${affected.length}곳은 실내 장소라는 근거를 찾지 못했어요.` : '저장된 정보만으로 실내 여부를 판정하지 못했어요.' });
  }
  if (scenarios.includes('closure') && target) findings.push({ scenario: 'closure', level: 'check', title: `${target.name}이 휴무인 경우`, affectedIds: [target.id], action: '이 장소 대안 비교', reason: '휴무를 가정한 결과예요. 실제 운영 여부는 방문 전 정보에서 다시 확인해야 해요.' });
  if (scenarios.includes('fatigue')) {
    const max = Number.isInteger(input.maxWalkMinutes) ? input.maxWalkMinutes : 15;
    const affected = places.filter(place => Number.isFinite(walking[place.id]?.longestMinutes) ? walking[place.id].longestMinutes > max : true);
    findings.push({ scenario: 'fatigue', level: affected.length ? 'check' : 'ready', title: '평소보다 빨리 피로한 경우', affectedIds: affected.map(place => place.id), action: '휴식 추가', reason: affected.length ? `${affected.length}개 구간은 ${max}분 걷기 기준으로 휴식 또는 이동 확인이 필요해요.` : `확인된 구간은 ${max}분 걷기 기준 안이에요.` });
  }
  if (scenarios.includes('route-loss')) {
    const affected = places.filter(place => routeReady[place.id] !== true);
    findings.push({ scenario: 'route-loss', level: affected.length ? 'unknown' : 'ready', title: '경로 조회가 실패한 경우', affectedIds: affected.map(place => place.id), action: '경로 다시 확인', reason: affected.length ? `${affected.length}개 구간은 이동 경로가 확인되지 않았어요.` : '현재 저장된 모든 구간에 조회된 경로가 있어요. 실제 통행 가능을 보장하지는 않아요.' });
  }
  const facilityUnknown = places.filter(place => required.some(key => !(place.accessibility || []).some(field => field.key === key && field.state === 'confirmed'))).length;
  return { scenarios, findings, facilityUnknown, checkedPlaces: places.length, resilient: findings.length > 0 && findings.every(item => item.level === 'ready') };
}
