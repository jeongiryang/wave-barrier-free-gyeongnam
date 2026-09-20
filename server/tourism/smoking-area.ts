import type { Env } from '../shared/env';
import { clean, json } from '../shared/http';
import { attemptProvider, commonParams, fetchTourismData, type ProviderItem, type ProviderResult } from '../shared/provider-data';
import { requestProvider } from '../shared/provider-request.js';
import { createBoundedSnapshotCache } from '../shared/bounded-snapshot';
import { supportedPlacePoint } from '../../lib/map-coordinates.js';
import { normalizeNoSmokingAreas, type SmokingAreaItem } from '../../lib/smoking-area.js';
import { SERVER_BUDGET_MS, budgetClock } from '../../lib/request-budget.js';

export type SmokingAreaResponse = {
  status: 'available' | 'empty' | 'invalid-request' | 'provider-error' | 'location-unconfirmed';
  contentId: string;
  kind: 'no-smoking';
  checkedAt: string;
  source: string;
  items: SmokingAreaItem[];
};

const SOURCE = '전국금연구역표준데이터';
const endpoint = 'https://api.data.go.kr/openapi/tn_pubr_public_prhsmk_zn_api';
const allowedQueries = new Set(['action', 'contentId']);
const snapshots = createBoundedSnapshotCache(100, 50);
const isGyeongnamPlace = (place: Record<string, unknown>) => String(place.lDongRegnCd || '') === '48' || String(place.areacode || '') === '36';

function response(contentId: string, status: SmokingAreaResponse['status'], items: SmokingAreaItem[] = [], checkedAt = ''): SmokingAreaResponse {
  return { status, contentId, kind: 'no-smoking', checkedAt, source: SOURCE, items };
}

function providerItems(data: unknown): ProviderResult {
  const root = data as { response?: { header?: { resultCode?: unknown }; body?: { items?: unknown; totalCount?: unknown } } };
  const code = clean(root?.response?.header?.resultCode, 20);
  if (!root?.response?.header || !['00', '0'].includes(code)) throw new Error('금연구역 데이터 응답 오류');
  const raw = root.response?.body?.items;
  const values = Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as { item?: unknown }).item)
    ? (raw as { item: unknown[] }).item : [];
  const items = values.filter((item): item is ProviderItem => Boolean(item && typeof item === 'object'));
  const total = Number(root.response?.body?.totalCount || items.length);
  return { items, total, ...(total > items.length ? { partial: true } : {}) };
}

export async function fetchNoSmokingData(env: Env, signguName: string): Promise<ProviderResult> {
  const key = env.TOUR_API_SERVICE_KEY_ENCODED?.trim();
  if (!key) throw new Error('공공데이터 인증키 설정 필요');
  const query = new URLSearchParams({
    pageNo: '1', numOfRows: '1000', type: 'json', ctprvnNm: '경상남도', ...(signguName ? { signguNm: signguName } : {}),
  });
  const result = await requestProvider(
    { provider: 'no-smoking-area', family: 'public-data', operation: 'tn_pubr_public_prhsmk_zn_api' },
    `${endpoint}?serviceKey=${key}&${query}`,
    { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(SERVER_BUDGET_MS.smokingArea) },
    fetch,
  );
  if (!result.ok) throw new Error(`금연구역 데이터 응답 ${result.status}`);
  let data: unknown;
  try { data = JSON.parse(await result.text()); } catch { throw new Error('금연구역 데이터 형식 오류'); }
  return providerItems(data);
}

function signguFrom(place: ProviderItem) {
  const address = clean(place.addr1, 240);
  const tokens = address.split(/\s+/);
  return tokens[0] === '경상남도' ? clean(tokens[1], 30) : '';
}

export async function handleSmokingArea(url: URL, env: Env) {
  const contentId = url.searchParams.get('contentId') || '';
  const keys = [...url.searchParams.keys()];
  if (keys.length !== 2 || keys.some(key => !allowedQueries.has(key)) || url.searchParams.getAll('action').length !== 1 || url.searchParams.getAll('contentId').length !== 1 || !/^[1-9]\d{0,11}$/.test(contentId)) {
    return json(response(contentId, 'invalid-request'), 400);
  }
  const remaining = budgetClock(SERVER_BUDGET_MS.smokingArea);
  const placeSnapshot = await snapshots.get<ProviderItem[]>(`smoking-place:${contentId}`, 15 * 60000, remaining, async () => {
    const result = await attemptProvider(fetchTourismData(env, 'KorService2', 'detailCommon2', { ...commonParams('1'), contentId }));
    return result.ok && !result.value.partial ? result.value.items : null;
  });
  if (!placeSnapshot) return json(response(contentId, 'provider-error'), 502);
  const place = placeSnapshot.value.find(item => String(item.contentid) === contentId);
  const point = place && isGyeongnamPlace(place) ? supportedPlacePoint(place.mapx, place.mapy) : null;
  if (!place || !point) return json(response(contentId, 'location-unconfirmed'));
  const signguName = signguFrom(place);
  const dataSnapshot = await snapshots.get<ProviderResult>(`no-smoking:${signguName || 'gyeongnam'}`, 24 * 60 * 60000, remaining, async () => {
    const result = await attemptProvider(fetchNoSmokingData(env, signguName));
    return result.ok && !result.value.partial ? result.value : null;
  });
  if (!dataSnapshot) return json(response(contentId, 'provider-error'), 502);
  const items = normalizeNoSmokingAreas(dataSnapshot.value.items, { latitude: point.lat, longitude: point.lng });
  return json(response(contentId, items.length ? 'available' : 'empty', items, dataSnapshot.checkedAt));
}

export function resetSmokingAreaCacheForTest() { snapshots.clear(); }
