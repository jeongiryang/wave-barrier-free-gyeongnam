import type { Env } from '../shared/env';
import { json } from '../shared/http';
import { attemptProvider, combineProviderResults, commonParams, fetchTourismData, type ProviderAttempt, type ProviderItem, type ProviderResult } from '../shared/provider-data';
import { requestProvider } from '../shared/provider-request.js';
import { providerFailure, ProviderRequestError } from '../../lib/provider-failure.js';
import { supportedPlacePoint } from '../../lib/map-coordinates.js';
import { rankParkingAlternatives } from '../../lib/parking-alternatives.js';
import { SERVER_BUDGET_MS, budgetClock, withinBudget } from '../../lib/request-budget.js';

const endpoint = 'https://api.data.go.kr/openapi/tn_pubr_prkplce_info_api';
const context = { provider: 'parking', family: 'public-data' as const, operation: 'tn_pubr_prkplce_info_api' };
const placeContext = { provider: 'kto', operation: 'KorService2/detailCommon2' };
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const allowedQueries = new Set(['action', 'contentId']);
const isGyeongnamPlace = (place: Record<string, unknown>) => String(place.lDongRegnCd || '') === '48' || String(place.areacode || '') === '36';
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown) => (typeof value === 'number' || typeof value === 'string' && /^\d+$/.test(value)) && Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null;
const malformed = () => new ProviderRequestError(providerFailure(context, 'malformed_response'));

type Lookup = { result: ProviderAttempt; checkedAt: string };
const cache = new Map<string, { lookup: Lookup; expires: number }>();
const pending = new Map<string, Promise<Lookup>>();

// Only complete successful records enter this bounded cache. In-flight failures
// are shared as evidence, rather than discarded or cached as empty records.
async function snapshot(key: string, ttl: number, remaining: () => number, source: typeof placeContext, work: () => Promise<ProviderResult>): Promise<Lookup> {
  const timeout = (): Lookup => ({ result: { ok: false, error: '조회 시간 초과', failure: providerFailure(source, 'timeout') }, checkedAt: '' });
  const stored = cache.get(key);
  if (stored && stored.expires > Date.now()) return stored.lookup;
  if (remaining() <= 0) return timeout();
  const existing = pending.get(key);
  if (existing) return withinBudget(existing, remaining(), timeout);
  if (pending.size >= 50) return { result: { ok: false, error: '조회 처리량 초과', unclassifiedFailure: true }, checkedAt: '' };
  const request = withinBudget(attemptProvider(work()).then(result => ({ result, checkedAt: new Date().toISOString() })), remaining(), timeout)
    .then(lookup => {
      if (lookup.result.ok && !lookup.result.value.partial) {
        if (cache.size >= 100) cache.delete(cache.keys().next().value!);
        cache.set(key, { lookup, expires: Date.now() + ttl });
      }
      return lookup;
    }).finally(() => { if (pending.get(key) === request) pending.delete(key); });
  pending.set(key, request);
  return request;
}

function parkingPage(data: unknown, pageNo: number, expectedTotal?: number): ProviderResult {
  const response = record(data) && record(data.response) ? data.response : null;
  const header = response && record(response.header) ? response.header : null;
  const body = response && record(response.body) ? response.body : null;
  if (!header || String(header.resultCode) !== '00' || !body) throw malformed();
  const total = integer(body.totalCount);
  if (total === null || expectedTotal !== undefined && total !== expectedTotal
    || body.pageNo !== undefined && integer(body.pageNo) !== pageNo
    || body.numOfRows !== undefined && integer(body.numOfRows) !== PAGE_SIZE) throw malformed();
  const raw = body.items;
  const items = Array.isArray(raw) ? raw : record(raw) && Array.isArray(raw.item) ? raw.item
    : total === 0 && (raw === undefined || raw === null || raw === '') ? [] : null;
  if (!items || items.length !== Math.min(PAGE_SIZE, Math.max(0, total - (pageNo - 1) * PAGE_SIZE))
    || items.some(item => !record(item) || typeof item.prkplceNo !== 'string' || !item.prkplceNo.trim()
      || String(item.pwdbsPpkZoneYn || '').trim().toUpperCase() !== 'Y')) throw malformed();
  return { items: items as ProviderItem[], total };
}

export async function fetchParkingData(env: Env, remaining = budgetClock(SERVER_BUDGET_MS.parkingAlternatives)): Promise<ProviderResult> {
  const key = env.TOUR_API_SERVICE_KEY_ENCODED?.trim();
  if (!key) throw new ProviderRequestError(providerFailure(context, 'missing_config'));
  if (remaining() <= 0) throw new ProviderRequestError(providerFailure(context, 'timeout'));
  const deadline = AbortSignal.timeout(Math.max(1, remaining()));
  const cancellation = new AbortController();
  const signal = AbortSignal.any([deadline, cancellation.signal]);
  async function page(pageNo: number, expectedTotal?: number): Promise<ProviderResult> {
    const query = new URLSearchParams({ pageNo: String(pageNo), numOfRows: String(PAGE_SIZE), type: 'json', pwdbsPpkZoneYn: 'Y' });
    let response;
    try {
      response = await requestProvider(context, `${endpoint}?serviceKey=${key}&${query}`, { headers: { Accept: 'application/json' }, signal }, fetch);
    } catch (error) {
      // Documented no-data is valid only before any positive total was received.
      if (error instanceof ProviderRequestError && error.failure.httpStatus === 200 && error.failure.code === '03') {
        if (pageNo === 1) return { items: [], total: 0 };
        throw malformed();
      }
      throw error;
    }
    if (!response.ok) throw new ProviderRequestError(providerFailure(context, 'upstream_error', { status: response.status }));
    let data: unknown;
    try { data = JSON.parse(await response.text()); } catch { throw malformed(); }
    return parkingPage(data, pageNo, expectedTotal);
  }
  const first = await page(1);
  const count = Math.ceil(first.total / PAGE_SIZE);
  if (count > MAX_PAGES) return { ...first, partial: true, unclassifiedFailure: true };
  const items = [...first.items];
  const ids = new Set<string>();
  const unique = (records: ProviderItem[]) => {
    for (const item of records) {
      const id = String(item.prkplceNo).trim();
      if (ids.has(id)) throw malformed();
      ids.add(id);
    }
  };
  unique(first.items);
  for (let start = 2; start <= count; start += 2) {
    const pages = Array.from({ length: Math.min(2, count - start + 1) }, (_, index) => start + index);
    const outcomes = await Promise.all(pages.map(async number => {
      const result = await attemptProvider(page(number, first.total));
      // A sibling abort is not an independent timeout. Distinct failures that
      // already returned remain observable, including mixed quota/parser errors.
      const cancelled = !result.ok && cancellation.signal.aborted && !deadline.aborted
        && result.failure?.kind === 'timeout' && result.failure.httpStatus === null && result.failure.code === null;
      if (!result.ok && !cancellation.signal.aborted) cancellation.abort();
      return { result, cancelled };
    }));
    const attempts = outcomes.filter(outcome => !outcome.cancelled).map(outcome => outcome.result);
    if (attempts.some(result => !result.ok)) {
      const combined = combineProviderResults(items, [{ ok: true, value: first }, ...attempts]);
      return { ...combined, total: first.total };
    }
    for (const result of attempts) if (result.ok) { unique(result.value.items); items.push(...result.value.items); }
  }
  if (items.length !== first.total) throw malformed();
  return { items, total: first.total };
}

function unavailable(contentId: string, result: ProviderAttempt, error: string) {
  const detail = result.ok ? result.value : result;
  const failures = detail.failures || [];
  const failure = !result.ok ? result.failure || failures[0] : failures[0];
  return json({ status: 'provider-error', contentId, error,
    ...(failure ? { failure } : {}), ...(failures.length ? { failures } : {}),
    ...(result.ok && result.value.partial ? { partial: true } : {}),
    ...(detail.unclassifiedFailure || !failure && !failures.length ? { unclassifiedFailure: true } : {}),
  }, 502);
}

export async function handleParkingAlternatives(url: URL, env: Env) {
  const contentId = url.searchParams.get('contentId') || '';
  const queryKeys = [...url.searchParams.keys()];
  if (queryKeys.length !== 2 || queryKeys.some(key => !allowedQueries.has(key)) || url.searchParams.getAll('action').length !== 1 || url.searchParams.getAll('contentId').length !== 1 || !/^[1-9]\d{0,11}$/.test(contentId)) {
    return json({ status: 'invalid-request', contentId, error: '공개 관광지 ID만 요청할 수 있습니다.' }, 400);
  }
  const remaining = budgetClock(SERVER_BUDGET_MS.parkingAlternatives);
  const placeLookup = await snapshot(`parking-place:${contentId}`, 15 * 60000, remaining, placeContext,
    () => fetchTourismData(env, 'KorService2', 'detailCommon2', { ...commonParams('1'), contentId }));
  if (!placeLookup.result.ok || placeLookup.result.value.partial) return unavailable(contentId, placeLookup.result, '관광지 위치를 확인하지 못했습니다.');
  const place = placeLookup.result.value.items.find(item => String(item.contentid) === contentId);
  const point = place && isGyeongnamPlace(place) ? supportedPlacePoint(place.mapx, place.mapy) : null;
  if (!place || !point) return json({ status: 'invalid-request', contentId, error: '경남의 공식 관광지 위치를 확인하지 못했습니다.' }, 400);
  const parkingLookup = await snapshot('parking:accessible-national', 24 * 60 * 60000, remaining, context, () => fetchParkingData(env, remaining));
  if (!parkingLookup.result.ok || parkingLookup.result.value.partial) return unavailable(contentId, parkingLookup.result, '주차장 정보를 확인하지 못했습니다.');
  const items = rankParkingAlternatives(parkingLookup.result.value.items, { latitude: point.lat, longitude: point.lng });
  return json({ status: items.length ? 'available' : 'empty', contentId, checkedAt: parkingLookup.checkedAt, source: '전국주차장정보표준데이터', items });
}

export function resetParkingAlternativesCacheForTest() { cache.clear(); pending.clear(); }
