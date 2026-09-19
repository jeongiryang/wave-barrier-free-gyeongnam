import type { Env } from '../shared/env';
import { clean, json } from '../shared/http';
import { attemptProvider, commonParams, fetchTourismData, type ProviderAttempt, type ProviderItem } from '../shared/provider-data';
import { supportedPlacePoint, mapDistanceMetres } from '../../lib/map-coordinates.js';
import { SERVER_BUDGET_MS, budgetClock, withinBudget } from '../../lib/request-budget.js';
import { FACILITIES } from '../../lib/facility-selection.js';
import { placeFrom, requestedAccessibilityFields } from './accessibility-model';

/**
 * 음식점 접근성 겹쳐 보기(스펙 08)의 서버 조회.
 *
 * 공개 `contentId` 하나만 받는다. 사용자 좌표·반경·이동 이력을 받는 필드를 두지
 * 않는다. 거리는 여행지 공개 좌표와 음식점 공개 좌표 사이의 값이다.
 *
 * 별점·후기 수·조회수·순위를 주는 공식 제공처가 없으므로 그런 값을 만들지도,
 * 응답 타입에 자리를 두지도 않는다. 편의 확인이 예산 안에 끝나지 않으면 그
 * 항목은 `unknown`으로 남는다. 없음으로 바꾸지 않는다.
 */

const SOURCE = '한국관광공사 국문 관광정보 · 무장애 여행정보' as const;
/** 서버가 정규화해 돌려주는 관광공사 음식점 상한. */
const ITEM_LIMIT = 10;
/** 편의 확인 대상 필드. 음식점 전용 점수 체계를 새로 만들지 않고 기존 목록을 그대로 쓴다. */
const DINING_PROFILES = FACILITIES.map((item) => item.key);

export type DiningFacility = { key: string; label: string; state: 'confirmed' | 'unknown' | 'negative' };
export type DiningPlace = {
  id: string;
  evidence: 'official';
  name: string;
  address: string;
  category?: string;
  distanceMeters: number;
  destination: { latitude: number; longitude: number };
  hours?: string;
  phone?: string;
  facilities: DiningFacility[];
  checkedAt: string;
  source: string;
};

type DiningBody = { contentId: string; checkedAt: string; source: typeof SOURCE; items: DiningPlace[] };
type DiningResponse =
  | { status: 'invalid-request'; contentId: string }
  | ({ status: 'available' } & DiningBody)
  | ({ status: 'empty' | 'provider-error' | 'location-unconfirmed'; message: string } & DiningBody);

type Snapshot = { response: { status: 'available' } & DiningBody; expires: number };
const cache = new Map<string, Snapshot>();
const CACHE_TTL_MS = 15 * 60_000;
const CACHE_LIMIT = 100;

/** 공개 음식점 기록만, 그리고 빠짐없이 확인한 결과만 담는다. 실패·부분 결과는 담지 않는다. */
function remember(id: string, response: { status: 'available' } & DiningBody) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(id, { response, expires: Date.now() + CACHE_TTL_MS });
}

const isGyeongnamPlace = (place: ProviderItem) => String(place.lDongRegnCd || '') === '48' || String(place.areacode || '') === '36';

export async function handleDiningAccessibility(url: URL, env: Env) {
  const id = url.searchParams.get('contentId') || '';
  if (!/^[1-9]\d{0,11}$/.test(id)) return json({ contentId: id, status: 'invalid-request' } satisfies DiningResponse, 400);

  const stored = cache.get(id);
  if (stored && stored.expires > Date.now()) return json(stored.response, 200, true);

  const remaining = budgetClock(SERVER_BUDGET_MS.diningAccessibility);
  const base = { contentId: id, checkedAt: new Date().toISOString(), source: SOURCE, items: [] as DiningPlace[] };
  const lookup = (service: string, operation: string, params: Record<string, string>) => withinBudget(
    attemptProvider(fetchTourismData(env, service, operation, params)),
    remaining(),
    (): ProviderAttempt => ({ ok: false, error: 'Dining accessibility deadline' }),
  );

  const common = await lookup('KorService2', 'detailCommon2', { ...commonParams('1'), contentId: id });
  if (!common.ok || common.value.partial) {
    return json({ ...base, status: 'provider-error', message: '음식점 정보를 받지 못했어요.' } satisfies DiningResponse, 502);
  }
  const place = common.value.items.find((item) => String(item.contentid) === id);
  const point = place && isGyeongnamPlace(place) ? supportedPlacePoint(place.mapx, place.mapy) : null;
  if (!place || !point) {
    return json({ ...base, status: 'location-unconfirmed', message: '이 여행지의 공개 좌표를 확인하지 못했어요.' } satisfies DiningResponse);
  }

  const district = clean(place.lDongSignguCd);
  const list = await lookup('KorService2', 'areaBasedList2', {
    ...commonParams('50'), arrange: 'Q', lDongRegnCd: '48', contentTypeId: '39',
    ...(/^\d{2,5}$/.test(district) ? { lDongSignguCd: district } : {}),
  });
  if (!list.ok) return json({ ...base, status: 'provider-error', message: '음식점 정보를 받지 못했어요.' } satisfies DiningResponse, 502);

  const nearby = list.value.items
    .flatMap((item) => {
      const spot = supportedPlacePoint(item.mapx, item.mapy);
      const contentId = clean(item.contentid);
      if (!spot || !contentId || contentId === id) return [];
      return [{ item, contentId, destination: { latitude: spot.lat, longitude: spot.lng }, distanceMeters: Math.round(mapDistanceMetres(point, spot)) }];
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, ITEM_LIMIT);
  if (!nearby.length && list.value.partial) return json({ ...base, status: 'provider-error', message: '음식점 정보를 받지 못했어요.' } satisfies DiningResponse, 502);
  if (!nearby.length) return json({ ...base, status: 'empty', message: '등록된 음식점 정보가 없어요.' } satisfies DiningResponse);

  // 편의 확인과 운영시간 조회는 상한 안에서만, 남은 예산 안에서만 한다. 예산을
  // 넘긴 항목은 확인하지 못한 것으로 남기고 목록 전체를 실패로 만들지 않는다.
  const expired = (): ProviderAttempt => ({ ok: false, error: 'Dining accessibility deadline' });
  const checks = await Promise.all(nearby.map(async ({ contentId }) => {
    const budget = remaining();
    const [detail, intro] = await Promise.all([
      withinBudget(attemptProvider(fetchTourismData(env, 'KorWithService2', 'detailWithTour2', { ...commonParams('1'), contentId })), budget, expired),
      withinBudget(attemptProvider(fetchTourismData(env, 'KorService2', 'detailIntro2', { ...commonParams('1'), contentId, contentTypeId: '39' })), budget, expired),
    ]);
    return { detail, intro, contentId };
  }));

  const labels = new Map(requestedAccessibilityFields(DINING_PROFILES));
  const checkedAt = new Date().toISOString();
  const items: DiningPlace[] = nearby.map(({ item, contentId, destination, distanceMeters }, index) => {
    const check = checks[index];
    const detail = check.detail.ok ? check.detail.value.items.find((entry) => String(entry.contentid) === contentId) || {} : {};
    const intro = check.intro.ok ? check.intro.value.items.find((entry) => String(entry.contentid) === contentId) : undefined;
    // 기존 placeFrom을 그대로 재사용한다. 음식점용 새 점수 체계를 만들지 않으며
    // 여기서는 세 상태로 나뉜 편의 항목만 꺼내 쓴다.
    const evaluated = placeFrom(item, detail, '경남 전체', DINING_PROFILES, index);
    const facilities: DiningFacility[] = evaluated.accessibility.map((entry) => ({
      key: entry.key, label: labels.get(entry.key) || entry.label, state: entry.state,
    }));
    const hours = clean(intro?.opentimefood, 200);
    const phone = clean(intro?.infocenterfood || item.tel, 160);
    return {
      id: contentId, evidence: 'official' as const, name: evaluated.name, address: evaluated.address,
      // 음식 종류: `areaBasedList2`가 주는 것은 `cat3` 같은 분류 코드뿐이고 읽을 수
      // 있는 종류 이름이 아니다. 코드를 이름으로 옮기는 표를 지어내지 않으므로
      // 관광공사 항목에는 `category`를 넣지 않는다. 카카오 장소 검색 결과는
      // `category_name`을 그대로 주므로 그 묶음에서만 표시한다.
      distanceMeters, destination,
      ...(hours ? { hours } : {}), ...(phone ? { phone } : {}),
      facilities, checkedAt, source: SOURCE,
    };
  });

  const response = { contentId: id, checkedAt, source: SOURCE, items, status: 'available' as const };
  const complete = !list.value.partial && checks.every(({ detail, intro }) => detail.ok && !detail.value.partial && intro.ok && !intro.value.partial);
  if (complete) remember(id, response);
  return json(response, 200, complete);
}
