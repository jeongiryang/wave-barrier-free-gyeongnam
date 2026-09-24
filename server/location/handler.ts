import { attemptProvider, commonParams, fetchTourismData } from '../shared/provider-data';
import { lookupPlaces } from '../tourism/place-lookup';
import { profileFields } from '../tourism/catalog';
import { canonicalPublicPlace } from '../../lib/place-identity';
import { SERVER_BUDGET_MS, UPSTREAM_TIMEOUT_MS } from "../../lib/request-budget.js";
import type { Env } from "../shared/env";
import { clean, httpsUrl, json } from "../shared/http";
import { requestProvider } from "../shared/provider-request.js";
import { caughtProviderFailure, providerFailureMessage } from "../../lib/provider-failure.js";

export function locationResultType(categoryCode: string, category: string) {
  if (categoryCode === "CE7" || /카페|커피|디저트/.test(category)) return "cafe" as const;
  if (categoryCode === "FD6" || /음식점|식당|한식|중식|일식|양식/.test(category)) return "restaurant" as const;
  if (categoryCode === "AT4" || /관광|명소|문화|박물관|미술관|공원|유적/.test(category)) return "tourism" as const;
  return "other" as const;
}

export function gyeongnamRegion(address: string) {
  const match = address.match(/(?:경상남도|경남)\s+([^\s]+)/);
  return match?.[1] || "경남";
}

export async function handleLocationSearch(request: Request, env: Env) {
  if (request.method !== "GET") return json({ error: "GET 요청만 지원합니다." }, 405);
  const key = env.KAKAO_REST_API_KEY?.trim();
  if (!key) return json({ error: "카카오 장소 검색 키가 연결되지 않았습니다." }, 503);
  const url = new URL(request.url);
  const query = clean(url.searchParams.get("q"), 100);
  const gyeongnamOnly = url.searchParams.get("scope") === "gyeongnam";
  if (query.length < 2) return json({ error: "두 글자 이상 입력해 주세요." }, 400);
  const searchSignal = AbortSignal.any([request.signal, AbortSignal.timeout(SERVER_BUDGET_MS.officialLocation)]);
  try {
    const scopedQuery = gyeongnamOnly && !/(경상남도|경남)/.test(query) ? `경상남도 ${query}` : query;
    const params = new URLSearchParams({ query: scopedQuery, size: "12", sort: "accuracy" });
    const response = await requestProvider({provider:"kakao-local",family:"kakao",operation:"keyword.json"}, `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`, {
      signal: AbortSignal.any([searchSignal, AbortSignal.timeout(UPSTREAM_TIMEOUT_MS.location)]),
      headers: { Authorization: `KakaoAK ${key}`, Accept: "application/json" },
    }, fetch);
    if (!response.ok) throw new Error(`장소 검색 응답 ${response.status}`);
    const data = await response.json() as { documents?: Array<Record<string, string>> };
    const places = (data.documents || []).filter(item => !gyeongnamOnly || /^(경상남도|경남)\s/.test(clean(item.road_address_name || item.address_name))).map((item) => ({
        id: clean(item.id),
        name: clean(item.place_name),
        address: clean(item.road_address_name || item.address_name),
        category: clean(item.category_group_name || item.category_name),
        categoryCode: clean(item.category_group_code),
        region: gyeongnamRegion(clean(item.road_address_name || item.address_name)),
        resultType: locationResultType(clean(item.category_group_code), clean(item.category_name)),
        summary: clean(item.category_name).split(" > ").slice(-2).join(" · "),
        mapX: clean(item.x),
        mapY: clean(item.y),
        placeUrl: httpsUrl(item.place_url),
      }));
    if (gyeongnamOnly && url.searchParams.get('official') === '1') {
      const signal = searchSignal;
      const profiles = [...new Set((url.searchParams.get('profiles') || '').split(',').filter(id => profileFields[id]))].slice(0, 6);
      let official = await attemptProvider(fetchTourismData(env, 'KorService2', 'searchKeyword2', { ...commonParams('12'), lDongRegnCd: '48', keyword: query }, signal));
      const compactQuery = query.replace(/\s+/g, '');
      // KTO keyword search can miss a venue solely because of spacing. Retry once
      // only after a complete empty response and an exact space-insensitive Kakao
      // name match. The same deadline and strict address/coordinate identity apply.
      if (official.ok && !official.value.partial && official.value.total === 0 && !official.value.items.length
        && compactQuery !== query && !signal.aborted
        && places.some(place => place.name.replace(/\s+/g, '').toLowerCase() === compactQuery.toLowerCase())) {
        official = await attemptProvider(fetchTourismData(env, 'KorService2', 'searchKeyword2', { ...commonParams('12'), lDongRegnCd: '48', keyword: compactQuery }, signal));
      }
      const candidates = official.ok ? official.value.items.map(item => ({ id: clean(item.contentid), name: clean(item.title), address: clean(item.addr1), mapX: clean(item.mapx), mapY: clean(item.mapy) })).filter(item => /^[1-9]\d{0,11}$/.test(item.id)) : [];
      const ids = [...new Set(places.map(item => canonicalPublicPlace(item, candidates)?.id).filter((id): id is string => Boolean(id)))].slice(0, 3);
      const officialPlaces = ids.length ? await lookupPlaces(ids, profiles, env, signal) : [];
      return json({ places, officialPlaces, officialState: !official.ok || official.value.partial || ids.some(id => !officialPlaces.some(place => place.id === id)) ? 'error' : 'available' }, 200, false);
    }
    return json({ places }, 200, true);
  } catch (error) {
    const failure = caughtProviderFailure(error,{provider:"kakao-local",operation:"keyword.json"});
    return json({ error:providerFailureMessage(failure),failure }, 502);
  }
}
