import type { Env } from '../shared/env';
import { clean, json } from '../shared/http';
import { attemptProvider, commonParams, fetchTourismData, fetchPublicTransportData, publicTransportKey, type ProviderAttempt } from '../shared/provider-data';
import { supportedPlacePoint } from '../../lib/map-coordinates.js';
import { nearbyReturnStops, groupReturnArrivals, returnRouteDirection, originBusTimes, transportId } from '../../lib/transport/return-transport.js';
import { SERVER_BUDGET_MS, budgetClock, withinBudget } from '../../lib/request-budget.js';

type Snapshot = { result: Extract<ProviderAttempt, { ok: true }>; checkedAt: string; expires: number };
const cache = new Map<string, Snapshot>();
const pending = new Map<string, Promise<Snapshot | null>>();
const baseUrl = 'https://apis.data.go.kr/1613000/';

// Public place/stop/route records only, bounded to the warm instance. No itinerary or GPS storage.
async function snapshot(key: string, ttl: number, remaining: () => number, work: () => Promise<ProviderAttempt>): Promise<Snapshot | null> {
  const stored = cache.get(key); if (stored && stored.expires > Date.now()) return stored;
  if (remaining() <= 0) return null;
  const existing = pending.get(key);
  if (existing) return withinBudget(existing, remaining(), () => null);
  if (pending.size >= 50) return null;
  const request = withinBudget(work(), remaining(), () => ({ ok: false as const, error: 'Return transport deadline' })).then(result => {
    if (!result.ok || result.value.partial) return null;
    const value = { result, checkedAt: new Date().toISOString(), expires: Date.now() + ttl };
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, value); return value;
  }).finally(() => pending.delete(key));
  pending.set(key, request); return request;
}

export async function handleReturnTransport(url: URL, env: Env) {
  const id = url.searchParams.get('contentId') || '';
  const nodeId = url.searchParams.get('nodeId') || '', cityCode = url.searchParams.get('cityCode') || '', routeId = url.searchParams.get('routeId') || '';
  if (!/^[1-9]\d{0,11}$/.test(id) || Boolean(nodeId) !== Boolean(cityCode) || (nodeId && (transportId(nodeId) !== nodeId || !/^\d{2,8}$/.test(cityCode))) || (routeId && (!nodeId || transportId(routeId) !== routeId))) return json({ id, status: 'invalid-request' }, 400);
  const base = { id, source: '국토교통부 TAGO · 한국관광공사', stops: [], routes: [], checkedAt: null, arrivalCheckedAt: null };
  if (!publicTransportKey(env, 'tago')) return json({ ...base, status: 'unavailable', message: '버스 정보를 연결하지 못했어요. 카카오맵에서 교통편을 확인해 주세요.' });
  const remaining = budgetClock(SERVER_BUDGET_MS.returnTransport);
  const common = await snapshot('place:' + id, 15 * 60000, remaining, () => attemptProvider(fetchTourismData(env, 'KorService2', 'detailCommon2', { ...commonParams('1'), contentId: id })));
  if (!common) return json({ ...base, status: 'provider-error', message: '장소 정보를 확인하지 못했어요. 잠시 후 다시 확인해 주세요.' }, 502);
  const place = common.result.value.items.find(item => String(item.contentid) === id);
  const point = place && String(place.lDongRegnCd) === '48' ? supportedPlacePoint(place.mapx, place.mapy) : null;
  if (!place || !point) return json({ ...base, status: 'location-unconfirmed', message: '경남의 공식 장소 위치를 확인하지 못했어요.' });
  const fetchTago = (service: string, operation: string, params: Record<string, string>) => attemptProvider(fetchPublicTransportData(env, 'tago', baseUrl + service, operation, params));
  const nearby = await snapshot('stops:' + id, 2 * 60000, remaining, () => fetchTago('BusSttnInfoInqireService', 'getCrdntPrxmtSttnList', { gpsLati: String(point.lat), gpsLong: String(point.lng), numOfRows: '8' }));
  if (!nearby) return json({ ...base, status: 'provider-error', message: '주변 정류장을 확인하지 못했어요. 운영기관의 정보 제공 범위를 확인하고 다시 시도해 주세요.' }, 502);
  const stops = nearbyReturnStops(nearby.result.value.items, point);
  const response = { ...base, placeName: clean(place.title), stops, checkedAt: nearby.checkedAt, moreStops: nearby.result.value.total > nearby.result.value.items.length };
  if (!nodeId) return json({ ...response, status: stops.length ? 'stops' : 'empty' });
  const selected = stops.find(stop => stop.nodeId === nodeId && stop.cityCode === cityCode);
  if (!selected) return json({ ...response, status: 'invalid-stop', message: '이 장소의 주변 목록에서 정류장을 다시 선택해 주세요.' }, 400);
  const arrivals = await snapshot('arrivals:' + cityCode + ':' + nodeId, 10000, remaining, () => fetchTago('ArvlInfoInqireService', 'getSttnAcctoArvlPrearngeInfoList', { cityCode, nodeId, numOfRows: '100' }));
  if (!arrivals) return json({ ...response, selected, status: 'arrivals-unavailable', message: '이 정류장의 도착 정보를 확인하지 못했어요. 운행 종료로 판단하지 말고 현장 안내나 카카오맵을 함께 확인해 주세요.' });
  const routes = groupReturnArrivals(arrivals.result.value.items, nodeId);
  const withArrivals = { ...response, selected, routes, arrivalCheckedAt: arrivals.checkedAt, moreArrivals: arrivals.result.value.total > arrivals.result.value.items.length };
  if (!routeId) return json({ ...withArrivals, status: routes.length ? 'arrivals' : 'no-arrivals' });
  if (!routes.some(route => route.routeId === routeId)) return json({ ...withArrivals, status: 'route-unavailable', message: '해당 노선의 현재 도착 정보가 없어 방향을 연결하지 못했어요. 도착 정보를 다시 확인해 주세요.' });
  const [ordered, detail] = await Promise.all([
    snapshot('route-stops:' + cityCode + ':' + routeId, 3600000, remaining, () => fetchTago('BusRouteInfoInqireService', 'getRouteAcctoThrghSttnList', { cityCode, routeId, numOfRows: '500' })),
    snapshot('route-info:' + cityCode + ':' + routeId, 3600000, remaining, () => fetchTago('BusRouteInfoInqireService', 'getRouteInfoIem', { cityCode, routeId })),
  ]);
  const details = detail?.result.value.items.find(item => String(item.routeid) === routeId);
  const direction = returnRouteDirection(ordered?.result.value.items || [], routeId, nodeId, Boolean(ordered && ordered.result.value.total <= ordered.result.value.items.length));
  return json({ ...withArrivals, status: 'route', routeId, direction, routeCheckedAt: ordered?.checkedAt || null, times: originBusTimes(details), timesCheckedAt: detail?.checkedAt || null });
}
