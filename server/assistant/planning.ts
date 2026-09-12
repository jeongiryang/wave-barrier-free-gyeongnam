import { clean, json, readTrustedJson } from '../shared/http';
import type { Env } from '../shared/env';
import { validateAssistantAction, type AssistantAction } from '../../lib/assistant-actions.js';
import { journeyDays, journeyOutcome, selectJourneyStops, fatigueRemovals, type ExistingStop, type NaruJourney } from '../../lib/naru-journey.js';
import type { VisitInfo } from '../../lib/visit-hours.js';
import { validTripDate, offsetTripDate } from '../../lib/trip-dates.js';
import { buildPlan } from '../tourism/plan-builder';
import { fetchFestivals, koreaToday } from '../tourism/festivals';
import { handleVisitInfo } from '../tourism/visit-info';
import { handleWeatherApi } from '../weather/handler';
import { profileFields, regionCodes, contentTypes } from '../tourism/catalog';
import { attemptProvider, commonParams, fetchTourismData } from '../shared/provider-data';
import { placeFrom } from '../tourism/accessibility-model';
import type { Place, WeatherData } from '../../features/planner/types';
import { planResponse } from '../../features/planner/services/plan-response';

type Progress = (phase: string, text: string) => void;
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const allowedList = (value: unknown, allowed: Record<string, unknown>) => (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []).filter((id): id is string => typeof id === 'string' && Boolean(allowed[id])).slice(0, 6);

/** Read-only orchestration. All venue records are fetched by the server; no DB mutation. */
export async function prepareJourney(action: AssistantAction, context: Record<string, unknown>, request: Request, env: Env, progress: Progress): Promise<NaruJourney> {
  let start = action.start || (validTripDate(context.start) ? String(context.start) : koreaToday());
  let end = action.end || (validTripDate(context.end) ? String(context.end) : start);
  let days = journeyDays(start, end);
  if (!days.length || (action.date && !days.includes(action.date))) throw new Error('여행 기간 안의 날짜로 요청해 주세요. 한 여행은 7일까지 만들 수 있어요.');
  const profiles = [...new Set([...allowedList(context.profiles, profileFields), ...(action.profiles || [])])];
  const indoorRequested = action.indoor === true || action.reason === 'rain';
  const themes = indoorRequested ? ['history'] : action.themes || allowedList(context.themes, contentTypes);
  if (!themes.length) themes.push('nature', 'history');
  let region = action.region || (regionCodes[String(context.region)] ? String(context.region) : '경남 전체');
  const transport = action.transport || (['walk','bicycle','transit','car'].includes(String(context.transport)) ? context.transport as NaruJourney['transport'] : 'transit');
  const relaxed = action.pace === 'relaxed' || action.reason === 'fatigue' || profiles.some(id => ['wheel','senior','pregnant','baby'].includes(id));
  const existing: ExistingStop[] = (Array.isArray(context.stops) ? context.stops : []).slice(0, 12).map(object).filter(stop => /^[1-9]\d{0,11}$/.test(String(stop.id)) && validTripDate(stop.date))
    .map(stop => ({ id: String(stop.id), date: String(stop.date), fixed: stop.fixed === true }));
  const warnings: string[] = [];
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(38000)]);
  let festival: Place | undefined;
  if (action.festival) {
    progress('searching', '여행 날짜에 열리는 경남 축제를 찾고 있어요.');
    const canProposeLater = !existing.length && !action.start && !action.end && !action.date && start === end;
    const events = await fetchFestivals(env, { region, start, end: canProposeLater ? offsetTripDate(end, 30) : end, profiles, signal });
    const keyword = action.festival.replace(/\s/g, '');
    const matches = events.items.filter(item => (keyword === 'any' || item.name.replace(/\s/g, '').includes(keyword))
      && (!profiles.includes('baby') || !/맥주|와인|막걸리|주류|성인전용/.test(item.name))
      && !(item.accessibility || []).some(field => field.state === 'negative'));
    festival = matches.find(item => item.startDate <= end && item.endDate >= start);
    if (!festival && canProposeLater && matches[0]) {
      festival = matches[0];
      const proposed = String(festival.startDate);
      warnings.push(`${start}에는 요청한 축제가 없어 실제 개최일 ${proposed}의 당일 여행을 제안해요. 적용 전 날짜를 확인해 주세요.`);
      start = proposed; end = proposed; days = [proposed];
    }
    if (festival) region = festival.city;
    else warnings.push(events.state === 'error' ? '축제 정보를 받지 못했어요. 일반 관광지 일정안을 먼저 준비했습니다.' : '이 날짜와 지역에서 요청한 축제를 확인하지 못했어요. 축제 페이지에서 기간을 바꿔볼 수 있어요.');
  }
  signal.throwIfAborted();
  progress('searching', `${region}의 실제 관광지와 필요한 편의 정보를 찾고 있어요.`);
  const url = new URL('/api/wave', request.url);
  url.search = new URLSearchParams({ action: 'plan', region, profiles: profiles.join(','), themes: themes.join(','), locale: 'ko' }).toString();
  const plan = planResponse(await buildPlan(new Request(url, { signal }), env));
  let candidates: Place[] = [...plan.places, ...(plan.explorationPlaces || [])];
  if (festival) candidates = [festival, ...candidates.filter(place => place.id !== festival.id)];
  if (region === '경남 전체' && candidates[0]?.city && regionCodes[candidates[0].city]) region = candidates[0].city;
  if (!profiles.length) { plan.places = candidates; plan.explorationPlaces = []; }
  if (plan.statuses.some(status => ['barrierfree','tour'].includes(status.id) && status.state === 'error')) warnings.push('일부 관광·편의 정보를 받지 못했어요. 미확인 항목을 확인한 뒤 방문해 주세요.');
  signal.throwIfAborted();
  progress('checking', `${candidates.length}곳의 방문 정보와 ${region} 날씨를 확인하고 있어요.`);
  const weatherPromise = handleWeatherApi(new Request(new URL(`/api/weather?region=${encodeURIComponent(region)}`, request.url), { signal })).then(async response => response.ok ? await response.json() as WeatherData : null).catch(() => null);
  const indoorById: Record<string, { state: string; detail?: string }> = {};
  const visitById: Record<string, VisitInfo> = {};
  const visitIds = [...new Set([...candidates.map(place => place.id), ...(action.action === 'adapt-itinerary' ? existing.map(stop => stop.id) : [])])];
  // Bounded concurrency and actual source wording; a museum name does not prove indoor access.
  let cursor = 0, checked = 0;
  const inspect = async () => {
    while (cursor < visitIds.length && !signal.aborted) {
      const id = visitIds[cursor++];
      try {
        const response = await handleVisitInfo(new URL(`/api/wave?contentId=${id}`, request.url), env, signal);
        const info = await response.json();
        if (response.ok && info.setting) indoorById[id] = info.setting;
        if (response.ok) visitById[id] = info;
      } catch { /* Missing evidence stays unknown. */ }
      progress('checking', `관광지 ${++checked}/${visitIds.length}곳 확인 · 실내 공간과 방문 정보를 살펴보고 있어요.`);
    }
  };
  await Promise.all([inspect(), inspect(), inspect()]);
  let weather = await weatherPromise;
  // Current venue IDs supplied by the client are rehydrated before distance comparisons.
  if (existing.length) await Promise.all(existing.map(async stop => {
    const known = candidates.find(place => place.id === stop.id);
    if (known) { stop.place = known; return; }
    const result = await attemptProvider(fetchTourismData(env, 'KorService2', 'detailCommon2', { ...commonParams('1'), contentId: stop.id }, signal));
    const item = result.ok ? result.value.items.find(item => clean(item.contentid) === stop.id && clean(item.lDongRegnCd) === '48') : undefined;
    if (item) stop.place = placeFrom(item, {}, region, [], 0);
  }));
  signal.throwIfAborted();
  progress('planning', '기존 방문을 보존하면서 날짜·방문 순서·휴식을 정리하고 있어요.');
  const restOnly = action.action === 'adapt-itinerary' && action.reason === 'fatigue' && existing.length > 0;
  const removed = restOnly ? fatigueRemovals(existing, days, action.date) : [];
  const stops = restOnly ? [] : selectJourneyStops({ places: candidates, days, profiles, indoor: indoorRequested, indoorById, visitById, relaxed, transport, existing, targetDay: action.date,
    replace: action.action === 'adapt-itinerary', anchorId: festival?.id });
  if ((!action.region || action.region === '경남 전체') && stops[0]?.place.city && regionCodes[stops[0].place.city] && region !== stops[0].place.city) {
    region = stops[0].place.city;
    progress('checking', `선택한 ${region} 코스의 날씨를 다시 확인하고 있어요.`);
    weather = await handleWeatherApi(new Request(new URL(`/api/weather?region=${encodeURIComponent(region)}`, request.url), { signal })).then(async response => response.ok ? await response.json() as WeatherData : null).catch(() => null);
  }
  if (!weather) warnings.push('날씨를 조회하지 못했어요. 일정은 유지하고 출발 전 다시 확인해 주세요.');
  else if (!days.every(day => weather?.days.some(forecast => forecast.date === day))) warnings.push('아직 예보가 나오지 않은 날짜가 있어요. 출발이 가까워지면 다시 확인해 주세요.');
  if (weather?.days.some(day => days.includes(day.date) && (day.rainProbability >= 60 || day.rain > 1)) && !indoorRequested) warnings.push('여행 기간에 비 예보가 있어요. 적용 후 나루에게 실내 대안을 요청할 수 있어요.');
  const conditionsChanged = Boolean(action.festival || action.originRegion || (action.region && action.region !== context.region)
    || (action.start && action.start !== context.start) || (action.end && action.end !== context.end) || (action.transport && action.transport !== context.transport)
    || action.profiles?.some(id => !allowedList(context.profiles, profileFields).includes(id))
    || action.themes && JSON.stringify([...action.themes].sort()) !== JSON.stringify(allowedList(context.themes, contentTypes).sort()));
  const outcome = journeyOutcome({ action: action.action, indoor: indoorRequested, existing, indoorById, stops, removed, restOnly, conditionsChanged,
    providerFailed: !weather || plan.statuses.some(status => ['barrierfree','tour'].includes(status.id) && (status.state === 'error' || status.partial)) });
  if (outcome.kind === 'unchanged') warnings.push('실내 공간의 기록이 이동 구간이나 모든 편의시설의 이용 가능 여부를 보장하지는 않아요. 방문 전 미확인 편의를 확인해 주세요.');
  else if (!stops.length && !restOnly) warnings.push(indoorRequested ? '요청한 편의와 실내 공간을 함께 확인한 대안이 없어요. 필수 편의를 유지하고 다른 지역이나 원문 미확인 후보를 살펴보세요.' : '이 조건으로 바로 더할 장소를 찾지 못했어요. 필요한 편의는 유지하고 활동이나 지역을 넓혀볼 수 있어요.');
  if (restOnly) warnings.push(`${removed.length ? `고정하지 않은 방문 ${removed.length}곳을 줄이고, ` : ''}방문 사이 휴식을 20분 이상으로 제안해요. 이미 길게 잡은 휴식은 유지합니다.`);
  if (restOnly && days.some(day => existing.filter(stop => stop.date === day && stop.fixed).length > 2)) warnings.push('고정한 방문이 하루 두 곳을 넘는 날짜는 그대로 보존합니다. 더 줄이려면 고정을 먼저 확인해 주세요.');
  // The accepted plan must include every proposed venue, including a festival
  // whose missing facility evidence is explicitly reviewed by the user.
  plan.places = [...new Map([...plan.places, ...stops.map(stop => stop.place)].map(place => [place.id, place])).values()];
  plan.explorationPlaces = plan.explorationPlaces?.filter(place => !plan.places.some(current => current.id === place.id));
  if (stops.some(stop => stop.unknown.length)) warnings.push('아래 별도 표시한 편의는 미확인입니다. 방문 전 문의가 필요한 후보로 구분했어요.');
  if (existing.some(stop => stop.fixed) && action.action === 'adapt-itinerary') warnings.push('고정한 장소와 방문일은 그대로 두었어요.');
  if (outcome.kind !== 'unchanged') warnings.push('체류·휴식 시간은 편집 가능한 제안입니다. 실제 이동시간과 통행 편의는 적용 후 경로에서 확인해 주세요.');
  return { action: action.action, outcome, start, end, region, profiles, themes, transport, relaxed, removed, restOnly, restDay: action.date, originRegion: action.originRegion, stops, plan, weather, warnings, generatedAt: new Date().toISOString() };
}

let active = 0;
const arrivals: number[] = [];
export async function handleJourneyPreparation(request: Request, env: Env) {
  if (request.method !== 'POST') return json({ error: 'POST 요청만 지원합니다.' }, 405);
  const parsed = await readTrustedJson(request, 18000);
  if (parsed.response) return parsed.response;
  const action = validateAssistantAction(parsed.body.action);
  if (!action || !['create-itinerary','adapt-itinerary'].includes(action.action)) return json({ error: '일정 요청을 확인해 주세요.' }, 400);
  while (arrivals[0] < Date.now() - 60000) arrivals.shift();
  if (active >= 2 || arrivals.length >= 12) return json({ error: '다른 여행을 확인하고 있어요. 잠시 뒤 다시 요청해 주세요.' }, 429);
  active++; arrivals.push(Date.now());
  const encoder = new TextEncoder();
  const abort = new AbortController();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (value: unknown) => { if (!abort.signal.aborted) controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`)); };
      try {
        const effective = new Request(request.url, { signal: AbortSignal.any([request.signal, abort.signal]) });
        const draft = await prepareJourney(action, object(parsed.body.context), effective, env, (phase, text) => emit({ type: 'progress', phase, text }));
        emit({ type: 'result', draft });
      } catch {
        emit({ type: 'error', text: '일정안을 마무리하지 못했어요. 기존 여행은 그대로 있으니 다시 요청하거나 직접 장소를 골라주세요.' });
      } finally { active--; if (!abort.signal.aborted) controller.close(); }
    },
    cancel() { abort.abort(); },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
