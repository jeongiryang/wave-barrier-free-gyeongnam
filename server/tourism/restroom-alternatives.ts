import type { Env } from '../shared/env';
import { json } from '../shared/http';
import { attemptProvider, commonParams, fetchTourismData } from '../shared/provider-data';
import { supportedPlacePoint } from '../../lib/map-coordinates.js';
import { rankRestroomAlternatives } from '../../lib/restroom-alternatives.js';
import type { RestroomAlternative } from '../../lib/restroom-alternatives.js';
import { SERVER_BUDGET_MS, budgetClock } from '../../lib/request-budget.js';
import { createBoundedSnapshotCache } from '../shared/bounded-snapshot';
import restroomArtifact from '../data/gyeongnam-restrooms.json';
import restroomManifest from '../data/gyeongnam-restrooms.manifest.json';

const snapshots = createBoundedSnapshotCache();
const allowedQueries = new Set(['action', 'contentId']);
const isGyeongnamPlace = (place: Record<string, unknown>) => String(place.lDongRegnCd || '') === '48' || String(place.areacode || '') === '36';

export async function handleRestroomAlternatives(url: URL, env: Env) {
  const contentId = url.searchParams.get('contentId') || '';
  const queryKeys = [...url.searchParams.keys()];
  if (queryKeys.length !== 2 || queryKeys.some(key => !allowedQueries.has(key)) || url.searchParams.getAll('action').length !== 1 || url.searchParams.getAll('contentId').length !== 1 || !/^[1-9]\d{0,11}$/.test(contentId)) {
    return json({ status: 'invalid-request', contentId, error: '공개 관광지 ID만 요청할 수 있습니다.' }, 400);
  }
  if (!restroomManifest.enabled || restroomManifest.audit.geocodedRows < restroomManifest.audit.requiredRows || restroomManifest.audit.geocodedCities.length < restroomManifest.audit.requiredCities) {
    return json({ status: 'data-gate-blocked', contentId, error: '검증된 공중화장실 데이터가 충분하지 않습니다.' }, 503);
  }
  const remaining = budgetClock(SERVER_BUDGET_MS.restroomAlternatives);
  const placeSnapshot = await snapshots.get(`restroom-place:${contentId}`, 15 * 60000, remaining, async () => {
    const result = await attemptProvider(fetchTourismData(env, 'KorService2', 'detailCommon2', { ...commonParams('1'), contentId }));
    return result.ok && !result.value.partial ? result.value.items : null;
  });
  if (!placeSnapshot) return json({ status: 'provider-error', contentId, error: '관광지 위치를 확인하지 못했습니다.' }, 502);
  const place = placeSnapshot.value.find(item => String(item.contentid) === contentId);
  const point = place && isGyeongnamPlace(place) ? supportedPlacePoint(place.mapx, place.mapy) : null;
  if (!place || !point) return json({ status: 'invalid-request', contentId, error: '경남의 공식 관광지 위치를 확인하지 못했습니다.' }, 400);
  const resultSnapshot = await snapshots.get<RestroomAlternative[]>(`restroom:${contentId}`, 24 * 60 * 60000, remaining, async () => rankRestroomAlternatives(restroomArtifact, { latitude: point.lat, longitude: point.lng }));
  if (!resultSnapshot) return json({ status: 'provider-error', contentId, error: '공중화장실 정보를 확인하지 못했습니다.' }, 502);
  const items = resultSnapshot.value;
  return json({ status: items.length ? 'available' : 'empty', contentId, checkedAt: restroomManifest.generatedAt, source: '전국공중화장실표준데이터', items });
}

export function resetRestroomAlternativesCacheForTest() { snapshots.clear(); }
