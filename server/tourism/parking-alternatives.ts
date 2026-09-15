import type { Env } from '../shared/env';
import { json } from '../shared/http';
import { attemptProvider, commonParams, fetchTourismData, type ProviderItem, type ProviderResult } from '../shared/provider-data';
import { requestProvider } from '../shared/provider-request.js';
import { supportedPlacePoint } from '../../lib/map-coordinates.js';
import { rankParkingAlternatives } from '../../lib/parking-alternatives.js';
import type { ParkingAlternative } from '../../lib/parking-alternatives.js';
import { SERVER_BUDGET_MS, budgetClock, withinBudget } from '../../lib/request-budget.js';

type Snapshot<T> = { value: T; checkedAt: string; expires: number };
const cache = new Map<string, Snapshot<unknown>>();
const pending = new Map<string, Promise<Snapshot<unknown> | null>>();
const endpoint = 'https://api.data.go.kr/openapi/tn_pubr_prkplce_info_api';
const allowedQueries = new Set(['action', 'contentId']);
const isGyeongnamPlace = (place: Record<string, unknown>) => String(place.lDongRegnCd || '') === '48' || String(place.areacode || '') === '36';

async function snapshot<T>(key: string, ttl: number, remaining: () => number, work: () => Promise<T | null>): Promise<Snapshot<T> | null> {
  const stored = cache.get(key);
  if (stored && stored.expires > Date.now()) return stored as Snapshot<T>;
  if (remaining() <= 0) return null;
  const existing = pending.get(key);
  if (existing) return withinBudget(existing, remaining(), () => null) as Promise<Snapshot<T> | null>;
  if (pending.size >= 50) return null;
  const request = withinBudget(work(), remaining(), () => null).then(result => {
    if (result === null) return null;
    const value = { value: result, checkedAt: new Date().toISOString(), expires: Date.now() + ttl };
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, value);
    return value;
  }).finally(() => pending.delete(key));
  pending.set(key, request as Promise<Snapshot<unknown> | null>);
  return request;
}

function parkingItems(data: unknown): ProviderResult {
  const root = data as { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: unknown; totalCount?: unknown } } };
  const header = root?.response?.header;
  if (!header || String(header.resultCode) !== '00') throw new Error('주차장 데이터 응답 오류');
  const raw = root.response?.body?.items;
  const items = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as { item?: unknown }).item) ? (raw as { item: Record<string, unknown>[] }).item : [];
  return { items: items.filter((item): item is ProviderItem => Boolean(item && typeof item === 'object')), total: Number(root.response?.body?.totalCount || items.length) };
}

export async function fetchParkingData(env: Env): Promise<ProviderResult> {
  const key = env.TOUR_API_SERVICE_KEY_ENCODED?.trim();
  if (!key) throw new Error('주차장 데이터 인증키 설정 필요');
  const query = new URLSearchParams({ pageNo: '1', numOfRows: '30000', type: 'json' }).toString();
  const response = await requestProvider({ provider: 'parking', family: 'public-data', operation: 'tn_pubr_prkplce_info_api' }, `${endpoint}?serviceKey=${key}&${query}`, {
    headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(SERVER_BUDGET_MS.parkingAlternatives),
  }, fetch);
  if (!response.ok) throw new Error(`주차장 데이터 응답 ${response.status}`);
  let data: unknown;
  try { data = JSON.parse(await response.text()); } catch { throw new Error('주차장 데이터 형식 오류'); }
  return parkingItems(data);
}

export async function handleParkingAlternatives(url: URL, env: Env) {
  const contentId = url.searchParams.get('contentId') || '';
  const queryKeys = [...url.searchParams.keys()];
  if (queryKeys.length !== 2 || queryKeys.some(key => !allowedQueries.has(key)) || url.searchParams.getAll('action').length !== 1 || url.searchParams.getAll('contentId').length !== 1 || !/^[1-9]\d{0,11}$/.test(contentId)) {
    return json({ status: 'invalid-request', contentId, error: '공개 관광지 ID만 요청할 수 있습니다.' }, 400);
  }
  const remaining = budgetClock(SERVER_BUDGET_MS.parkingAlternatives);
  const placeSnapshot = await snapshot(`parking-place:${contentId}`, 15 * 60000, remaining, async () => {
    const result = await attemptProvider(fetchTourismData(env, 'KorService2', 'detailCommon2', { ...commonParams('1'), contentId }));
    return result.ok && !result.value.partial ? result.value.items : null;
  });
  if (!placeSnapshot) return json({ status: 'provider-error', contentId, error: '관광지 위치를 확인하지 못했습니다.' }, 502);
  const place = placeSnapshot.value.find(item => String(item.contentid) === contentId);
  const point = place && isGyeongnamPlace(place) ? supportedPlacePoint(place.mapx, place.mapy) : null;
  if (!place || !point) return json({ status: 'invalid-request', contentId, error: '경남의 공식 관광지 위치를 확인하지 못했습니다.' }, 400);
  const parkingSnapshot = await snapshot<ParkingAlternative[]>(`parking:${contentId}`, 24 * 60 * 60000, remaining, async () => {
    const result = await attemptProvider(fetchParkingData(env));
    return result.ok && !result.value.partial ? rankParkingAlternatives(result.value.items, { latitude: point.lat, longitude: point.lng }) : null;
  });
  if (!parkingSnapshot) return json({ status: 'provider-error', contentId, error: '주차장 정보를 확인하지 못했습니다.' }, 502);
  const items = parkingSnapshot.value;
  return json({ status: items.length ? 'available' : 'empty', contentId, checkedAt: parkingSnapshot.checkedAt, source: '전국주차장정보표준데이터', items });
}

export function resetParkingAlternativesCacheForTest() { cache.clear(); pending.clear(); }
