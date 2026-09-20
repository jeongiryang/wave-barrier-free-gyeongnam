import type { Env } from '../shared/env';
import { json } from '../shared/http';
import { attemptProvider, commonParams, fetchTourismData } from '../shared/provider-data';
import { requestProvider } from '../shared/provider-request.js';
import { supportedPlacePoint } from '../../lib/map-coordinates.js';
import { rankSanitarySupplies, type SanitarySupplyItem } from '../../lib/sanitary-supply.js';
import { SERVER_BUDGET_MS, budgetClock } from '../../lib/request-budget.js';
import { createBoundedSnapshotCache } from '../shared/bounded-snapshot';

const snapshots = createBoundedSnapshotCache();
const allowedQueries = new Set(['action', 'contentId']);
const isGyeongnamPlace = (place: Record<string, unknown>) => String(place.lDongRegnCd || '') === '48' || String(place.areacode || '') === '36';

function records(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== 'object') throw new Error('여성용품 데이터 응답 계약 오류');
  const root = data as { response?: { header?: { resultCode?: string }; body?: { items?: unknown } }; items?: unknown };
  if (root.response?.header && String(root.response.header.resultCode) !== '00') throw new Error('여성용품 데이터 응답 오류');
  const raw = root.response?.body?.items ?? root.items ?? data;
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as { item?: unknown }).item) ? (raw as { item: unknown[] }).item : null;
  if (!list) throw new Error('여성용품 데이터 응답 계약 오류');
  if (list.some(item => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error('여성용품 데이터 항목 오류');
  return list as Record<string, unknown>[];
}

export async function fetchSanitarySupplyData(env: Env) {
  const endpoint = env.SANITARY_SUPPLY_API_URL?.trim();
  const key = env.TOUR_API_SERVICE_KEY_ENCODED?.trim();
  if (!endpoint || !key || !/^https:\/\//i.test(endpoint)) throw new Error('여성용품 공공데이터 연결 설정 필요');
  const url = new URL(endpoint);
  let decodedKey = key;
  try { decodedKey = decodeURIComponent(key); } catch { /* Already a raw key. */ }
  url.searchParams.set('serviceKey', decodedKey);
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('numOfRows', '10000');
  url.searchParams.set('type', 'json');
  const response = await requestProvider({ provider: 'sanitary-supply', family: 'public-data', operation: 'sanitary-supply-list' }, url.toString(), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(SERVER_BUDGET_MS.sanitarySupply) }, fetch);
  if (!response.ok) throw new Error(`여성용품 데이터 응답 ${response.status}`);
  try { return records(JSON.parse(await response.text())); } catch { throw new Error('여성용품 데이터 형식 오류'); }
}

export async function handleSanitarySupply(url: URL, env: Env) {
  const contentId = url.searchParams.get('contentId') || '';
  const queryKeys = [...url.searchParams.keys()];
  if (queryKeys.length !== 2 || queryKeys.some(key => !allowedQueries.has(key)) || url.searchParams.getAll('action').length !== 1 || url.searchParams.getAll('contentId').length !== 1 || !/^[1-9]\d{0,11}$/.test(contentId))
    return json({ status: 'invalid-request', contentId, checkedAt: new Date().toISOString(), source: '공공데이터', items: [], error: '공개 관광지 ID만 요청할 수 있습니다.' }, 400);
  const remaining = budgetClock(SERVER_BUDGET_MS.sanitarySupply);
  const placeSnapshot = await snapshots.get(`sanitary-place:${contentId}`, 15 * 60000, remaining, async () => {
    const result = await attemptProvider(fetchTourismData(env, 'KorService2', 'detailCommon2', { ...commonParams('1'), contentId }));
    return result.ok && !result.value.partial ? result.value.items : null;
  });
  if (!placeSnapshot) return json({ status: 'provider-error', contentId, checkedAt: new Date().toISOString(), source: '공공데이터', items: [] }, 502);
  const place = placeSnapshot.value.find(item => String(item.contentid) === contentId);
  if (!place || !isGyeongnamPlace(place)) return json({ status: 'invalid-request', contentId, checkedAt: placeSnapshot.checkedAt, source: '공공데이터', items: [] }, 400);
  const point = place && isGyeongnamPlace(place) ? supportedPlacePoint(place.mapx, place.mapy) : null;
  if (!point) return json({ status: 'location-unconfirmed', contentId, checkedAt: placeSnapshot.checkedAt, source: '공공데이터', items: [] }, 200);
  const supplySnapshot = await snapshots.get<SanitarySupplyItem[]>(`sanitary:${contentId}`, 24 * 60 * 60000, remaining, async () => {
    try { return rankSanitarySupplies(await fetchSanitarySupplyData(env), { latitude: point.lat, longitude: point.lng }); }
    catch { return null; }
  });
  if (!supplySnapshot) return json({ status: 'provider-error', contentId, checkedAt: new Date().toISOString(), source: '공공데이터', items: [] }, 502);
  return json({ status: supplySnapshot.value.length ? 'available' : 'empty', contentId, checkedAt: supplySnapshot.checkedAt, source: '경상남도 여성용품 공공데이터', items: supplySnapshot.value });
}

export function resetSanitarySupplyCacheForTest() { snapshots.clear(); }
