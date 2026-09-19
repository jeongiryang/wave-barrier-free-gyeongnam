import { facilityLabel, resolveFacilityKeys } from './facility-selection.js';

const clean = (value, fallback = '미확인') => {
  const text = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, 300) : fallback;
};
const states = new Set(['confirmed', 'negative', 'unknown']);

/** Build a deterministic audit of the current trip. This never fills missing evidence. */
export function buildTripDecisionReceipt(input = {}) {
  const requiredKeys = resolveFacilityKeys({ facilityKeys: input.requiredKeys });
  const places = Array.isArray(input.places) ? input.places.slice(0, 100).map(place => {
    const entries = Array.isArray(place?.accessibility) ? place.accessibility : [];
    const evidence = requiredKeys.map(key => {
      const item = entries.find(entry => entry?.key === key);
      const state = states.has(item?.state) ? item.state : 'unknown';
      return { key, label: facilityLabel(key), state, detail: clean(item?.detail, '제공된 자료에서 확인되지 않음') };
    });
    return {
      id: clean(place?.id), name: clean(place?.name), source: clean(place?.source),
      checkedAt: clean(place?.checkedAt), evidence,
    };
  }) : [];
  const routes = Array.isArray(input.routes) ? input.routes.slice(0, 200).map(route => ({
    day: clean(route?.day), from: clean(route?.from), to: clean(route?.to),
    state: ['confirmed', 'private', 'unknown'].includes(route?.state) ? route.state : 'unknown',
    provider: clean(route?.provider), minutes: Number.isFinite(route?.minutes) && route.minutes >= 0 ? Math.round(route.minutes) : null,
  })) : [];
  const evidence = places.flatMap(place => place.evidence);
  return {
    criteria: {
      region: clean(input.region), theme: clean(input.theme),
      travelStart: clean(input.travelStart), travelEnd: clean(input.travelEnd),
      travelMode: clean(input.travelMode),
      facilities: requiredKeys.map(key => ({ key, label: facilityLabel(key) })),
    },
    totals: {
      places: places.length, requirements: evidence.length,
      confirmed: evidence.filter(item => item.state === 'confirmed').length,
      negative: evidence.filter(item => item.state === 'negative').length,
      unknown: evidence.filter(item => item.state === 'unknown').length,
      routes: routes.length, confirmedRoutes: routes.filter(item => item.state === 'confirmed').length,
    },
    places, routes,
  };
}

const facilityState = { confirmed: '확인', negative: '없음으로 확인', unknown: '미확인' };
const routeState = { confirmed: '경로 조회됨', private: '기기 안 출발지 · 외부 조회 안 함', unknown: '미확인' };

export function tripDecisionReceiptText(receipt, createdAt = new Date().toISOString()) {
  const { criteria, totals, places, routes } = receipt;
  const lines = [
    'WAVE 결정 근거 영수증',
    `저장 시각: ${clean(createdAt)}`,
    '',
    '[내가 정한 조건]',
    `지역: ${criteria.region}`,
    `활동: ${criteria.theme}`,
    `날짜: ${criteria.travelStart} ~ ${criteria.travelEnd}`,
    `이동 방식: ${criteria.travelMode}`,
    `필요한 편의: ${criteria.facilities.length ? criteria.facilities.map(item => item.label).join(', ') : '선택 안 함'}`,
    '',
    '[공공데이터 대조 결과]',
    `장소 ${totals.places}곳 · 편의 확인 ${totals.confirmed} · 없음 ${totals.negative} · 미확인 ${totals.unknown}`,
    `이동 구간 ${totals.routes}개 · 경로 조회 ${totals.confirmedRoutes}개`,
    '',
    '[장소별 근거]',
  ];
  for (const place of places) {
    lines.push(`${place.name} · 관광 콘텐츠 ID ${place.id}`, `제공처: ${place.source} · 자료 확인: ${place.checkedAt}`);
    lines.push(...(place.evidence.length ? place.evidence.map(item => `- ${item.label}: ${facilityState[item.state]} · ${item.detail}`) : ['- 따로 선택한 편의 조건 없음']));
  }
  lines.push('', '[이동 구간]');
  lines.push(...(routes.length ? routes.map(route => `${route.day} · ${route.from} → ${route.to}: ${routeState[route.state]}${route.state === 'confirmed' ? ` · ${route.provider} · 약 ${route.minutes}분` : ''}`) : ['이동 구간 없음']));
  lines.push('', '[읽는 법]', '경로 조회는 도로·대중교통 경로가 있다는 뜻이며 휠체어 통행, 경사, 엘리베이터 운영을 보장하지 않습니다.', '미확인 항목은 방문 전에 시설 운영기관에 다시 확인해 주세요.', '이 문서는 현재 화면의 공공데이터와 사용자가 정한 조건을 그대로 정리하며, 없는 근거를 AI가 만들어 채우지 않습니다.');
  return lines.join('\n');
}
