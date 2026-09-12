import type { Env } from '../shared/env';
import { clean, json } from '../shared/http';
import { attemptProvider, commonParams, fetchTourismData } from '../shared/provider-data';
import { placeFrom } from './accessibility-model';
import { regionCodes, profileFields } from './catalog';
import { validTripDate, offsetTripDate } from '../../lib/trip-dates.js';

export const koreaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const dateFrom = (value: unknown) => { const raw = clean(value, 8); const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`; return validTripDate(date) ? date : ''; };

export async function fetchFestivals(env: Env, { region = '경남 전체', start = koreaToday(), end = offsetTripDate(start, 30), profiles = [], signal }: { region?: string; start?: string; end?: string; profiles?: string[]; signal?: AbortSignal } = {}) {
  // Include festivals which started before the selected period and are still running.
  const result = await attemptProvider(fetchTourismData(env, 'KorService2', 'searchFestival2', { ...commonParams('500'), arrange: 'A', lDongRegnCd: '48', eventStartDate: offsetTripDate(start, -365).replaceAll('-', ''), eventEndDate: end.replaceAll('-', '') }, signal));
  if (!result.ok) return { items: [], state: 'error' as const, checkedAt: new Date().toISOString(), partial: false };
  const today = koreaToday();
  const selected = result.value.items.filter(item => {
    const from = dateFrom(item.eventstartdate), to = dateFrom(item.eventenddate);
    const inRegion = region === '경남 전체' || regionCodes[region]?.legal.includes(clean(item.lDongSignguCd)) || clean(item.addr1).includes(region);
    return /^[1-9]\d{0,11}$/.test(clean(item.contentid)) && clean(item.lDongRegnCd) === '48' && inRegion && from && to && from <= end && to >= start;
  }).sort((a, b) => dateFrom(a.eventstartdate).localeCompare(dateFrom(b.eventstartdate)));
  const items = await Promise.all(selected.slice(0, 40).map(async (item, index) => {
    const details = profiles.length && index < 8 ? await attemptProvider(fetchTourismData(env, 'KorWithService2', 'detailWithTour2', { ...commonParams('1'), contentId: clean(item.contentid) }, signal)) : null;
    const place = placeFrom(item, details?.ok ? details.value.items[0] || {} : {}, region, profiles, index);
    const startDate = dateFrom(item.eventstartdate), endDate = dateFrom(item.eventenddate);
    return { ...place, contentTypeId: '15', startDate, endDate, state: endDate < today ? 'ended' as const : startDate > today ? 'upcoming' as const : 'ongoing' as const,
      phone: clean(item.tel, 100), officialUrl: clean(item.cotid) ? `https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=${encodeURIComponent(clean(item.cotid))}` : '',
      facilityState: details?.ok ? 'checked' as const : details ? 'error' as const : 'unchecked' as const };
  }));
  return { items, state: items.length ? 'available' as const : 'empty' as const, checkedAt: new Date().toISOString(), partial: Boolean(result.value.partial || result.value.total > 500 || selected.length > 40) };
}

export async function handleFestivals(request: Request, env: Env) {
  if (request.method !== 'GET') return json({ error: 'GET 요청만 지원합니다.' }, 405);
  const url = new URL(request.url), region = url.searchParams.get('region') || '경남 전체';
  const start = url.searchParams.get('start') || koreaToday();
  if (!validTripDate(start)) return json({ error: '조회 시작 날짜를 확인해 주세요.' }, 400);
  const end = url.searchParams.get('end') || offsetTripDate(start, 30);
  if (!regionCodes[region] || !validTripDate(start) || !validTripDate(end) || end < start || end > offsetTripDate(start, 366)) return json({ error: '지역과 조회 기간을 확인해 주세요.' }, 400);
  const profiles = (url.searchParams.get('profiles') || '').split(',').filter(id => profileFields[id]).slice(0, 6);
  const data = await fetchFestivals(env, { region, start, end, profiles, signal: request.signal });
  return json(data, data.state === 'error' ? 502 : 200, data.state !== 'error');
}
