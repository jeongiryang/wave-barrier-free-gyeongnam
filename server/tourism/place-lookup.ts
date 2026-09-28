import type { Env } from '../shared/env';
import { clean, json } from '../shared/http';
import { attemptProvider, commonParams, fetchTourismData } from '../shared/provider-data';
import { supportedPlacePoint } from '../../lib/map-coordinates.js';
import { profileFields } from './catalog';
import { placeFrom } from './accessibility-model';
import type { ProviderFailure } from '../../lib/provider-failure.js';

export async function lookupPlaces(ids: string[], profiles: string[], env: Env, signal?: AbortSignal, onFailure?: (failure: ProviderFailure) => void) {
  const output: Array<ReturnType<typeof placeFrom> & { facilityLookupState: string }> = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < ids.length && !signal?.aborted) {
      const contentId = ids[cursor++];
      const [common, details] = await Promise.all([
        attemptProvider(fetchTourismData(env, 'KorService2', 'detailCommon2', { ...commonParams('1'), contentId }, signal)),
        profiles.length ? attemptProvider(fetchTourismData(env, 'KorWithService2', 'detailWithTour2', { ...commonParams('1'), contentId }, signal)) : null,
      ]);
      if (!common.ok && common.failure) onFailure?.(common.failure);
      if (details && !details.ok && details.failure) onFailure?.(details.failure);
      const item = common.ok && !common.value.partial ? common.value.items.find(item => clean(item.contentid) === contentId && clean(item.lDongRegnCd) === '48' && supportedPlacePoint(item.mapx, item.mapy)) : undefined;
      if (!item) continue;
      const detail = details?.ok ? details.value.items.find(item => clean(item.contentid) === contentId) : undefined;
      output.push({ ...placeFrom(item, detail || {}, '경남 전체', profiles, 0), facilityLookupState: !profiles.length ? 'not-requested' : details?.ok ? 'available' : 'error' });
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return ids.flatMap(id => { const place = output.find(place => place.id === id); return place ? [place] : []; });
}

export async function handlePlaceLookup(request: Request, env: Env) {
  const url = new URL(request.url);
  const ids = (url.searchParams.get('ids') || '').split(',');
  if (!ids.length || ids.length > 12 || ids.some(id => !/^[1-9]\d{0,11}$/.test(id)) || new Set(ids).size !== ids.length) return json({ error: '확인할 장소를 1~12곳 골라주세요.' }, 400);
  const profiles = (url.searchParams.get('profiles') || '').split(',').filter(id => profileFields[id]).slice(0, 6);
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(12000)]);
  const failures: ProviderFailure[] = [];
  const places = await lookupPlaces(ids, profiles, env, signal, failure => failures.push(failure));
  const missing = ids.filter(id => !places.some(place => place.id === id));
  const failure = missing.length ? failures.find(item => item.kind === 'quota_exhausted') || failures.find(item => item.kind === 'rate_limited') || failures[0] : undefined;
  return json({ places, missing, ...(failure ? { failure } : {}), checkedAt: new Date().toISOString() }, 200, false);
}
