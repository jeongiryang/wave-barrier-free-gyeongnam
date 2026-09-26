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
const rejectionReasons = ['json', 'envelope', 'normal-code', 'total', 'total-changed', 'page-no', 'rows-meta', 'items-shape', 'row-count', 'row-object', 'row-id', 'filter-value', 'repeated-page', 'later-no-data', 'final-count', 'page-cap'] as const;
type RejectionReason = typeof rejectionReasons[number];
function valueShape(value: unknown) {
  const type = value === undefined ? 'missing' : value === null ? 'null' : Array.isArray(value) ? 'array'
    : record(value) ? 'object' : typeof value === 'string' ? 'string' : typeof value === 'number' ? 'number'
      : typeof value === 'boolean' ? 'boolean' : 'missing';
  return { type, ...(Array.isArray(value) && Number.isSafeInteger(value.length) ? { length: value.length } : {}) };
}
const knownField = (value: unknown, field: string) => record(value) ? value[field] : undefined;
function codeShape(value: unknown) {
  const code = knownField(value, 'resultCode');
  return code === undefined ? 'missing' : code === 0 || code === '0' ? '0' : code === '00' ? '00' : code === '0000' ? '0000' : 'other';
}
// Mirrors the fixed public-data code list in provider-failure.js for diagnostics
// only; a gateway shape still fails the parking response contract.
const gatewayCodes = new Set(['0', '00', '0000', '01', '02', '03', '04', '05', '10', '11', '12', '20', '21', '22', '23', '29', '30', '31', '32', '33', '99']);
function gatewayCodeShape(value: unknown) {
  const code = knownField(value, 'returnReasonCode');
  if (code === undefined) return 'missing';
  return (typeof code === 'string' || typeof code === 'number') && gatewayCodes.has(String(code)) ? String(code) : 'other';
}
function containerShape(value: unknown) {
  const total = integer(knownField(value, 'totalCount'));
  return { ...valueShape(value), code: codeShape(value),
    data: valueShape(knownField(value, 'data')), items: valueShape(knownField(value, 'items')),
    results: valueShape(knownField(value, 'results')), records: valueShape(knownField(value, 'records')),
    error: valueShape(knownField(value, 'error')), errors: valueShape(knownField(value, 'errors')),
    ...(total === null ? {} : { totalCount: total }),
  };
}
function envelopeShape(value: unknown) {
  const response = knownField(value, 'response'), header = knownField(value, 'header'), responseHeader = knownField(response, 'header');
  const serviceResponse = knownField(value, 'OpenAPI_ServiceResponse'), serviceMessageHeader = knownField(serviceResponse, 'cmmMsgHeader');
  return {
    root: containerShape(value), response: containerShape(response),
    header: { ...valueShape(header), code: codeShape(header) }, body: valueShape(knownField(value, 'body')),
    responseHeader: { ...valueShape(responseHeader), code: codeShape(responseHeader) }, responseBody: valueShape(knownField(response, 'body')),
    serviceResponse: valueShape(serviceResponse), serviceMessageHeader: { ...valueShape(serviceMessageHeader), code: gatewayCodeShape(serviceMessageHeader) },
  };
}
function recordRejection(reason: RejectionReason, counts: { page?: number; expected?: number; actual?: number } = {}, shape?: ReturnType<typeof envelopeShape>) {
  // Fixed field names and enum values only. Never retain raw response content,
  // provider messages, URLs, credentials, record identifiers or record values.
  const safeCounts = Object.fromEntries(['page', 'expected', 'actual'].flatMap(name => {
    const value = counts[name as keyof typeof counts];
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? [[name, value]] : [];
  }));
  console.warn(JSON.stringify({ event: 'parking-response-rejected', reason: rejectionReasons.includes(reason) ? reason : 'envelope', ...safeCounts,
    ...(reason === 'envelope' && shape ? { shape } : {}),
  }));
}
function malformed(reason: RejectionReason, counts: { page?: number; expected?: number; actual?: number } = {}, shape?: ReturnType<typeof envelopeShape>) {
  recordRejection(reason, counts, shape);
  return new ProviderRequestError(providerFailure(context, 'malformed_response'));
}

type SnapshotOutcome = 'complete' | 'partial' | 'page-cap' | 'repeated-page' | 'timeout' | 'error';
function recordProgress(event: 'parking-snapshot-started' | 'parking-snapshot-finished', counts: Record<string, number>, outcome?: SnapshotOutcome) {
  const safeCounts = Object.fromEntries(['total', 'plannedPages', 'pageSize', 'completedPages', 'receivedRows', 'elapsedMs', 'remainingMs'].flatMap(name =>
    Number.isSafeInteger(counts[name]) && counts[name] >= 0 ? [[name, counts[name]]] : []));
  console.info(JSON.stringify({ event, ...safeCounts, ...(outcome ? { outcome } : {}) }));
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  return record(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
}
async function pageFingerprint(items: ProviderItem[]) {
  // Full record multiset, including duplicate multiplicity. The digest is local
  // to this lookup and neither it nor the canonical public records are logged.
  const page = JSON.stringify(items.map(item => JSON.stringify(canonical(item))).sort());
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(page));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

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
  // The provider also returns root header/body. An explicit response property
  // remains authoritative, even when malformed; never mask it with flat data.
  const envelope = record(data) && !Object.hasOwn(data, 'response') ? data : knownField(data, 'response');
  const response = record(envelope) ? envelope : null;
  const header = response && record(response.header) ? response.header : null;
  const body = response && record(response.body) ? response.body : null;
  if (!header || !body) throw malformed('envelope', { page: pageNo }, envelopeShape(data));
  if (String(header.resultCode) !== '00') throw malformed('normal-code', { page: pageNo });
  const total = integer(body.totalCount);
  if (total === null) throw malformed('total', { page: pageNo });
  if (expectedTotal !== undefined && total !== expectedTotal) throw malformed('total-changed', { page: pageNo, expected: expectedTotal, actual: total });
  if (body.pageNo !== undefined && integer(body.pageNo) !== pageNo) throw malformed('page-no', { page: pageNo, expected: pageNo, actual: integer(body.pageNo) ?? undefined });
  if (body.numOfRows !== undefined && integer(body.numOfRows) !== PAGE_SIZE) throw malformed('rows-meta', { page: pageNo, expected: PAGE_SIZE, actual: integer(body.numOfRows) ?? undefined });
  const raw = body.items;
  const items = Array.isArray(raw) ? raw : record(raw) && Array.isArray(raw.item) ? raw.item
    : total === 0 && (raw === undefined || raw === null || raw === '') ? [] : null;
  if (!items) throw malformed('items-shape', { page: pageNo });
  const expected = Math.min(PAGE_SIZE, Math.max(0, total - (pageNo - 1) * PAGE_SIZE));
  if (items.length !== expected) throw malformed('row-count', { page: pageNo, expected, actual: items.length });
  const invalidObjects = items.filter(item => !record(item)).length;
  if (invalidObjects) throw malformed('row-object', { page: pageNo, actual: invalidObjects });
  const invalidIds = items.filter(item => typeof item.prkplceNo !== 'string' || !item.prkplceNo.trim()).length;
  if (invalidIds) throw malformed('row-id', { page: pageNo, actual: invalidIds });
  const unconfirmed = items.filter(item => String(item.pwdbsPpkZoneYn || '').trim().toUpperCase() !== 'Y').length;
  if (unconfirmed) throw malformed('filter-value', { page: pageNo, actual: unconfirmed });
  return { items: items as ProviderItem[], total };
}

export async function fetchParkingData(env: Env, remaining = budgetClock(SERVER_BUDGET_MS.parkingAlternatives)): Promise<ProviderResult> {
  const key = env.TOUR_API_SERVICE_KEY_ENCODED?.trim();
  if (!key) throw new ProviderRequestError(providerFailure(context, 'missing_config'));
  if (remaining() <= 0) throw new ProviderRequestError(providerFailure(context, 'timeout'));
  const deadline = AbortSignal.timeout(Math.max(1, remaining()));
  const cancellation = new AbortController();
  const signal = AbortSignal.any([deadline, cancellation.signal]);
  const startedAt = Date.now();
  let completedPages = 0, receivedRows = 0, loggedFinish = false;
  let outcome: SnapshotOutcome = 'error';
  const finish = () => {
    if (loggedFinish) return;
    loggedFinish = true;
    recordProgress('parking-snapshot-finished', { completedPages, receivedRows, elapsedMs: Date.now() - startedAt }, outcome);
  };
  const onDeadline = () => { outcome = 'timeout'; finish(); };
  deadline.addEventListener('abort', onDeadline, { once: true });
  async function page(pageNo: number, expectedTotal?: number): Promise<ProviderResult> {
    const query = new URLSearchParams({ pageNo: String(pageNo), numOfRows: String(PAGE_SIZE), type: 'json', pwdbsPpkZoneYn: 'Y' });
    let response;
    try {
      response = await requestProvider(context, `${endpoint}?serviceKey=${key}&${query}`, { headers: { Accept: 'application/json' }, signal }, fetch);
    } catch (error) {
      // Documented no-data is valid only before any positive total was received.
      if (error instanceof ProviderRequestError && error.failure.httpStatus === 200 && error.failure.code === '03') {
        if (pageNo === 1) { completedPages++; return { items: [], total: 0 }; }
        throw malformed('later-no-data', { page: pageNo, expected: expectedTotal, actual: 0 });
      }
      throw error;
    }
    if (!response.ok) throw new ProviderRequestError(providerFailure(context, 'upstream_error', { status: response.status }));
    let data: unknown;
    try { data = JSON.parse(await response.text()); } catch { throw malformed('json', { page: pageNo }); }
    const result = parkingPage(data, pageNo, expectedTotal);
    completedPages++; receivedRows += result.items.length;
    return result;
  }
  try {
    const first = await page(1);
    const count = Math.max(1, Math.ceil(first.total / PAGE_SIZE));
    recordProgress('parking-snapshot-started', { total: first.total, plannedPages: count, pageSize: PAGE_SIZE, receivedRows, elapsedMs: Date.now() - startedAt, remainingMs: remaining() });
    if (count > MAX_PAGES) {
      outcome = 'page-cap';
      recordRejection('page-cap', { page: 1, expected: PAGE_SIZE * MAX_PAGES, actual: first.total });
      return { ...first, partial: true, unclassifiedFailure: true };
    }
    const items = [...first.items], fingerprints = new Map<string, number>();
    const verifyPage = async (records: ProviderItem[], page: number) => {
      if (!records.length) return;
      const fingerprint = await pageFingerprint(records);
      if (deadline.aborted || remaining() <= 0) throw new ProviderRequestError(providerFailure(context, 'timeout'));
      const previousPage = fingerprints.get(fingerprint);
      if (previousPage !== undefined) {
        outcome = 'repeated-page';
        throw malformed('repeated-page', { page, expected: previousPage, actual: page });
      }
      fingerprints.set(fingerprint, page);
    };
    await verifyPage(first.items, 1);
    for (let start = 2; start <= count; start += 2) {
      const pages = Array.from({ length: Math.min(2, count - start + 1) }, (_, index) => start + index);
      const outcomes = await Promise.all(pages.map(async number => {
        const result = await attemptProvider(page(number, first.total));
        // A sibling abort is not an independent timeout. Distinct failures that
        // already returned remain observable, including mixed quota/parser errors.
        const cancelled = !result.ok && cancellation.signal.aborted && !deadline.aborted
          && result.failure?.kind === 'timeout' && result.failure.httpStatus === null && result.failure.code === null;
        if (!result.ok && !cancellation.signal.aborted) cancellation.abort();
        return { result, cancelled, page: number };
      }));
      const attempts = outcomes.filter(outcome => !outcome.cancelled).map(outcome => outcome.result);
      if (attempts.some(result => !result.ok)) {
        outcome = deadline.aborted ? 'timeout' : 'partial';
        const combined = combineProviderResults(items, [{ ok: true, value: first }, ...attempts]);
        return { ...combined, total: first.total };
      }
      for (const result of outcomes) if (result.result.ok) { await verifyPage(result.result.value.items, result.page); items.push(...result.result.value.items); }
    }
    if (items.length !== first.total) throw malformed('final-count', { expected: first.total, actual: items.length });
    if (deadline.aborted || remaining() <= 0) throw new ProviderRequestError(providerFailure(context, 'timeout'));
    outcome = 'complete';
    return { items, total: first.total };
  } catch (error) {
    if (error instanceof ProviderRequestError && error.failure.kind === 'timeout') outcome = 'timeout';
    throw error;
  } finally {
    deadline.removeEventListener('abort', onDeadline);
    finish();
  }
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
