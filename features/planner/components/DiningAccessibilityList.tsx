'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { DiningAccessibilityResponse, DiningFacility, DiningPlace, Place } from '../types';
import { optionalPlannerJson } from '../services/api';
import { CLIENT_BUDGET_MS } from '../../../lib/request-budget.js';
import {
  DINING_EVIDENCE_NOTE, DINING_GROUPS, dedupeNearbyDining, diningDistanceText, diningFacilityTagText, diningFacilityTags,
} from '../../../lib/dining-accessibility.js';
import { filterByFoodCategory, foodCategoryOf, foodCategoryOptions } from '../../../lib/food-category.js';
import { repeatedNameIds } from '../../../lib/local-place-filter.js';
import { loadKakaoSdk } from '../../routing/kakao-sdk';
import { parseNearbyPlaces } from '../../routing/nearby-place-data';
import FilterChipRow, { ToggleChip } from './FilterChipRow';

/** 스펙 35: 반복 판정 기준. 설정으로 노출하지 않고 고정한다. */
const LOCAL_NAME_THRESHOLD = 2;

/**
 * 음식점 접근성 겹쳐 보기(스펙 08).
 *
 * 별점·후기 수·조회수·순위·인기 배지를 어떤 형태로도 보여주지 않는다. 개별
 * 음식점의 그런 값을 주는 공식 제공처가 없기 때문이다. 외부 후기 본문을 가져와
 * 넣지 않고 카카오 장소 페이지로 나가는 링크만 제공한다.
 *
 * 두 묶음은 근거가 다르므로 섞지 않는다. 관광공사 등록 음식점은 편의시설을
 * 확인할 수 있고, 카카오 장소 검색 결과는 확인할 수 없다.
 *
 * 거리는 여행지 공개 좌표 기준이다. 사용자 좌표를 서버로 보내지 않고, 새
 * `navigator.geolocation` 호출부를 만들지 않으며, 외부 링크에 출발지 좌표를
 * 붙이지 않는다.
 */

/** 카카오 장소 검색 반경. 여행지 공개 좌표를 중심으로 한 거리이며 사용자 위치와 무관하다. */
const PLACE_SEARCH_RADIUS_METRES = 2_000;
/** 브라우저 SDK가 직접 부르므로 서버 예산에 대응 항목이 없다. 기존 장소 검색과 같은 한도를 쓴다. */
const PLACE_SEARCH_TIMEOUT_MS = 10_000;
const PLACE_SEARCH_SOURCE = '카카오 장소 검색';

type ListState = 'loading' | 'available' | 'empty' | 'provider-error' | 'location-unconfirmed';
type NearbyState = { state: 'idle' | 'loading' | 'ready' | 'empty' | 'error'; items: DiningPlace[] };

const card: CSSProperties = {
  background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)',
  boxShadow: 'none', padding: '14px 16px', marginBlock: '10px', listStyle: 'none',
};
const line: CSSProperties = { margin: '2px 0', color: 'var(--muted)', fontSize: '.9rem' };
const tagList: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '6px', listStyle: 'none', padding: 0, margin: '8px 0 0' };
const externalLink: CSSProperties = { display: 'inline-flex', alignItems: 'center', minHeight: '44px' };
const actionRow: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' };

function badgeStyle(state: DiningFacility['state']): CSSProperties {
  if (state === 'confirmed') return { background: 'var(--sky)', color: 'var(--ink)' };
  // 상태를 색으로만 알리지 않는다. 명시적 부재는 배경 없는 테두리 칩, 미확인은
  // 점선 테두리에 흐린 글자로 모양까지 다르게 한다.
  if (state === 'negative') return { background: 'transparent', color: 'var(--ink)' };
  return { background: 'transparent', color: 'var(--muted)', borderStyle: 'dashed' };
}

const CheckMark = () => <svg aria-hidden="true" focusable="false" width="12" height="12" viewBox="0 0 12 12"><path d="M1.5 6.4 4.3 9.2 10.5 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

function DiningCard({ item, requestedKeys }: { item: DiningPlace; requestedKeys: string[] }) {
  const { shown, hidden } = diningFacilityTags(item.facilities, requestedKeys);
  return <li style={card}>
    <h4 style={{ margin: '0 0 4px', fontSize: '1rem' }}>{item.name}</h4>
    <p style={line}>{diningDistanceText(item.distanceMeters)}{item.address ? ` · ${item.address}` : ''}</p>
    {item.category && <p style={line}>음식 종류: {item.category}</p>}
    {item.hours && <p style={line}>운영시간: {item.hours}</p>}
    {item.evidence === 'official'
      ? <ul style={tagList} aria-label={`${item.name} 편의시설`}>
        {shown.map(facility => <li key={facility.key} className="access-badge" style={badgeStyle(facility.state)}>
          {facility.state === 'confirmed' && <CheckMark />}{diningFacilityTagText(facility)}
        </li>)}
        {hidden > 0 && <li className="access-badge" style={badgeStyle('unknown')}>+{hidden}</li>}
      </ul>
      : <p style={line}>편의시설: 확인되지 않음</p>}
    {item.placeUrl && <p style={{ margin: '4px 0 0' }}><a style={externalLink} href={item.placeUrl} target="_blank" rel="noopener noreferrer">장소 정보 보기</a></p>}
    <p style={{ ...line, fontSize: '.8rem' }}>{item.source} · {item.checkedAt}</p>
  </li>;
}

function focusCondition(selector: string, onClose?: () => void) {
  onClose?.();
  window.requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus());
}

/**
 * 음식 종류로 거르기(스펙 39)의 화면 상태. 두 묶음(관광공사 등록·카카오 장소
 * 검색)은 근거가 다르므로 각자 독립된 선택 상태를 가진다. 관광공사 묶음은
 * `category` 필드를 주지 않으므로(서버 `dining-accessibility.ts` 참고)
 * `foodCategoryOptions`가 항상 빈 배열을 돌려주고, `FilterChipRow`는 그 경우
 * 아무 것도 그리지 않는다. 종류 선택 줄을 조건문으로 따로 숨기지 않아도 관광
 * 공사 묶음에는 자연히 나타나지 않는다.
 */
function useFoodCategoryFilter(items: DiningPlace[]) {
  const [selected, setSelected] = useState<string[]>([]);
  const [showUncategorized, setShowUncategorized] = useState(false);
  const options = useMemo(() => foodCategoryOptions(items), [items]);
  const toggle = useCallback((id: string) => setSelected(prev => (prev.includes(id) ? prev.filter(value => value !== id) : [...prev, id])), []);
  const clear = useCallback(() => { setSelected([]); setShowUncategorized(false); }, []);
  const filtered = useMemo(() => filterByFoodCategory(items, selected), [items, selected]);
  const uncategorizedCount = useMemo(
    () => (selected.length ? items.filter(item => foodCategoryOf(item.category) === null).length : 0),
    [items, selected],
  );
  const display = useMemo(() => {
    if (!selected.length) return items;
    if (!showUncategorized) return filtered;
    const filteredIds = new Set(filtered.map(item => item.id));
    return items.filter(item => filteredIds.has(item.id) || foodCategoryOf(item.category) === null);
  }, [items, selected, showUncategorized, filtered]);
  return { options, selected, toggle, clear, display, uncategorizedCount, showUncategorized, setShowUncategorized };
}

/**
 * 지역 가게 보기(스펙 35)의 "같은 이름이 여러 곳에 있는 가게 접어두기" 상태.
 * 지금 화면의 결과 목록(전달받은 `items`, 다른 거르기가 적용되기 전 원본)
 * 안에서만 반복을 판정한다. 반복 판정은 39번 종류 거르기와 독립이므로, 어느
 * 거르기를 먼저 적용해도 같은 결과가 나온다. 결과를 지우지 않고 접기만
 * 하며, 접힌 항목은 언제나 다시 펼칠 수 있다.
 */
function useLocalPlaceFilter(items: DiningPlace[]) {
  const [collapseRepeated, setCollapseRepeated] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const repeatedIds = useMemo(() => new Set(repeatedNameIds(items, LOCAL_NAME_THRESHOLD)), [items]);
  const toggle = useCallback(() => { setCollapseRepeated(value => !value); setExpanded(false); }, []);
  const apply = useCallback((list: DiningPlace[]) => (
    !collapseRepeated || expanded ? list : list.filter(item => !repeatedIds.has(item.id))
  ), [collapseRepeated, expanded, repeatedIds]);
  return { collapseRepeated, toggle, expanded, setExpanded, repeatedIds, apply };
}

export default function DiningAccessibilityList({ place, onClose }: { place: Place; onClose?: () => void }) {
  const placeId = place.id;
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${placeId}:${attempt}`;
  // 결과에 어떤 요청의 것인지 함께 담아, 장소가 바뀌면 이전 결과를 쓰지 않고
  // 곧바로 불러오는 중으로 읽는다. 렌더 중에 상태를 다시 쓰지 않는다.
  const [result, setResult] = useState<{ key: string; state: ListState; items: DiningPlace[] }>({ key: '', state: 'loading', items: [] });
  const [nearby, setNearby] = useState<NearbyState & { key: string }>({ key: '', state: 'idle', items: [] });
  const searchRequest = useRef<AbortController | null>(null);
  const state: ListState = result.key === requestKey ? result.state : 'loading';
  const items = useMemo(() => (result.key === requestKey ? result.items : []), [result, requestKey]);
  const nearbyView: NearbyState = nearby.key === placeId ? nearby : { state: 'idle', items: [] };
  // 요청된 편의 조건은 여행 조건에서 고른 것이며, 장소 상세가 이미 그 조건만
  // 담아 온다. 결과 수를 늘리려고 이 조건을 해제하지 않는다.
  const requestedKeys = (place.accessibility || []).map(field => field.key);
  const officialFoodFilter = useFoodCategoryFilter(items);
  const nearbyFoodFilter = useFoodCategoryFilter(nearbyView.items);
  const officialLocalFilter = useLocalPlaceFilter(items);
  const nearbyLocalFilter = useLocalPlaceFilter(nearbyView.items);
  // "관광정보에 등록된 곳만 보기": 08번의 두 묶음은 이미 근거로 나뉘어 있으므로
  // (관광공사 등록 / 카카오 장소 검색), 이 선택은 확인되지 않은 카카오 묶음
  // 섹션 전체를 숨기는 것으로 구현한다. 결과를 지우지 않고 화면에서 접을
  // 뿐이며, 다시 끄면 그대로 되돌아온다.
  const [officialOnly, setOfficialOnly] = useState(false);
  const officialDisplay = officialLocalFilter.apply(officialFoodFilter.display);
  const nearbyDisplay = nearbyLocalFilter.apply(nearbyFoodFilter.display);
  const officialEmptyByFood = officialFoodFilter.selected.length > 0 && officialFoodFilter.display.length === 0;
  const officialEmptyByLocal = !officialEmptyByFood && officialFoodFilter.display.length > 0 && officialDisplay.length === 0;
  const nearbyEmptyByFood = nearbyFoodFilter.selected.length > 0 && nearbyFoodFilter.display.length === 0;
  const nearbyEmptyByLocal = !nearbyEmptyByFood && nearbyFoodFilter.display.length > 0 && nearbyDisplay.length === 0;

  useEffect(() => {
    const request = new AbortController();
    void (async () => {
      const data = await optionalPlannerJson<DiningAccessibilityResponse>(
        `/api/wave?action=dining-accessibility&contentId=${encodeURIComponent(placeId)}`,
        { signal: request.signal, timeoutMs: CLIENT_BUDGET_MS.diningAccessibility },
      );
      if (request.signal.aborted) return;
      if (!data) { setResult({ key: requestKey, state: 'provider-error', items: [] }); return; }
      const received = Array.isArray(data.items) ? data.items : [];
      const next: ListState = data.status === 'available' ? (received.length ? 'available' : 'empty')
        : data.status === 'empty' || data.status === 'location-unconfirmed' ? data.status : 'provider-error';
      setResult({ key: requestKey, state: next, items: received });
    })();
    return () => request.abort();
  }, [placeId, requestKey]);

  // 장소가 바뀌거나 화면이 닫히면 진행 중인 장소 검색도 멈춘다.
  useEffect(() => () => searchRequest.current?.abort(), [placeId]);

  const searchNearby = useCallback(async () => {
    const lat = Number(place.mapY), lng = Number(place.mapX);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { setNearby({ key: placeId, state: 'error', items: [] }); return; }
    searchRequest.current?.abort();
    const request = new AbortController();
    searchRequest.current = request;
    setNearby({ key: placeId, state: 'loading', items: [] });
    const finish = (next: NearbyState) => { if (!request.signal.aborted) setNearby({ key: placeId, ...next }); };
    try {
      const response = await fetch('/api/map-config', { headers: { Accept: 'application/json' }, signal: request.signal });
      const key = response.ok ? ((await response.json()) as { javascriptKey?: string }).javascriptKey || '' : '';
      if (!key) { finish({ state: 'error', items: [] }); return; }
      await loadKakaoSdk(key);
      if (request.signal.aborted) return;
      const sdk = window.kakao?.maps;
      const services = sdk?.services;
      if (!sdk || !services) { finish({ state: 'error', items: [] }); return; }
      const area = { lat, lng, radius: PLACE_SEARCH_RADIUS_METRES };
      const timer = window.setTimeout(() => finish({ state: 'error', items: [] }), PLACE_SEARCH_TIMEOUT_MS);
      const checkedAt = new Date().toISOString();
      new services.Places().categorySearch('FD6', (result, status) => {
        window.clearTimeout(timer);
        if (request.signal.aborted) return;
        if (status === services.Status.ZERO_RESULT) { finish({ state: 'empty', items: [] }); return; }
        if (status !== services.Status.OK) { finish({ state: 'error', items: [] }); return; }
        const parsed = parseNearbyPlaces(result, area);
        if (!parsed) { finish({ state: 'error', items: [] }); return; }
        const found: DiningPlace[] = parsed.places.map(entry => ({
          id: entry.id, evidence: 'place-search' as const, name: entry.place_name,
          address: entry.road_address_name || entry.address_name,
          ...(entry.category_name ? { category: entry.category_name } : {}),
          distanceMeters: Number(entry.distance) || 0,
          destination: { latitude: lat, longitude: lng },
          facilities: [], ...(entry.place_url ? { placeUrl: entry.place_url } : {}),
          checkedAt, source: PLACE_SEARCH_SOURCE,
        }));
        const unique = dedupeNearbyDining(items, found);
        finish({ state: unique.length ? 'ready' : 'empty', items: unique });
      }, { location: new sdk.LatLng(lat, lng), radius: PLACE_SEARCH_RADIUS_METRES, size: 15, sort: services.SortBy.DISTANCE });
    } catch {
      finish({ state: 'error', items: [] });
    }
  }, [place.mapX, place.mapY, placeId, items]);

  return <section className="dining-accessibility" aria-label={`${place.name} 주변 음식점 편의 정보`}>
    <div style={actionRow}>
      <ToggleChip pressed={officialOnly} onClick={() => setOfficialOnly(value => !value)}>관광정보에 등록된 곳만 보기</ToggleChip>
    </div>
    <p style={line}>한국관광공사 관광정보에 등록된 음식점이에요.</p>
    <h3>{DINING_GROUPS.official.title}</h3>
    <p style={line}>{DINING_GROUPS.official.evidence}</p>
    <div aria-live="polite">
      {state === 'loading' && <p>주변 음식점의 편의 정보를 확인하고 있어요.</p>}
      {state === 'provider-error' && <div>
        <p role="alert">음식점 정보를 받지 못했어요.</p>
        <div style={actionRow}><button type="button" onClick={() => setAttempt(value => value + 1)}>다시 시도</button></div>
      </div>}
      {state === 'location-unconfirmed' && <p role="alert">이 여행지의 공개 좌표를 확인하지 못했어요.</p>}
      {state === 'empty' && <div>
        <p>등록된 음식점 정보가 없어요.</p>
        {/* 결과 수를 늘리려고 고른 편의 조건을 해제하지 않는다. 조건은 그대로 두고
            다음 두 가지를 함께 제공한다. */}
        <div style={actionRow}>
          <button type="button" onClick={() => focusCondition('select[aria-label="여행 지역"]', onClose)}>조건을 유지한 채 다른 지역 보기</button>
          <button type="button" onClick={() => focusCondition('.simple-facility-trigger', onClose)}>조건 바꾸기</button>
        </div>
      </div>}
      {state === 'available' && <>
        <FilterChipRow options={officialFoodFilter.options} selected={officialFoodFilter.selected} onToggle={officialFoodFilter.toggle} onClear={officialFoodFilter.clear} ariaLabel="편의 정보가 확인된 음식점 종류" />
        {officialFoodFilter.uncategorizedCount > 0 && !officialFoodFilter.showUncategorized && <p style={line}>종류가 등록되지 않은 {officialFoodFilter.uncategorizedCount}곳은 숨겨졌어요. <button type="button" onClick={() => officialFoodFilter.setShowUncategorized(true)}>함께 보기</button></p>}
        <div style={actionRow}>
          <ToggleChip pressed={officialLocalFilter.collapseRepeated} onClick={officialLocalFilter.toggle}>같은 이름이 여러 곳에 있는 가게 접어두기</ToggleChip>
        </div>
        <p style={line}>지금 결과 안에서 같은 이름이 2곳 이상 나온 가게예요. 체인인지 여부는 확인되지 않았어요.</p>
        {officialLocalFilter.collapseRepeated && officialLocalFilter.repeatedIds.size > 0 && <p style={line}>
          같은 이름 {officialLocalFilter.repeatedIds.size}곳 접음{' '}
          <button type="button" onClick={() => officialLocalFilter.setExpanded(value => !value)}>{officialLocalFilter.expanded ? '접기' : '펼치기'}</button>
        </p>}
        {officialEmptyByFood
          ? <div><p>고른 종류에 맞는 곳이 없어요.</p><div style={actionRow}><button type="button" onClick={officialFoodFilter.clear}>선택 지우기</button></div></div>
          : officialEmptyByLocal
            ? <div><p>조건에 맞는 곳이 없어요.</p><div style={actionRow}><button type="button" onClick={officialLocalFilter.toggle}>조건 끄기</button></div></div>
            : <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {officialDisplay.map(item => <DiningCard key={item.id} item={item} requestedKeys={requestedKeys} />)}
            </ul>}
      </>}
    </div>

    {!officialOnly && <>
      <h3>{DINING_GROUPS.placeSearch.title}</h3>
      <p style={line}>{DINING_GROUPS.placeSearch.evidence}</p>
      <div style={actionRow}>
        <button type="button" onClick={() => void searchNearby()} disabled={nearbyView.state === 'loading'}>주변 음식점 더 보기</button>
      </div>
      <div aria-live="polite">
        {nearbyView.state === 'idle' && <p style={line}>누르면 그때 카카오 장소 검색을 실행해요. 자동으로 부르지 않아요.</p>}
        {nearbyView.state === 'loading' && <p>주변 음식점을 찾고 있어요.</p>}
        {nearbyView.state === 'error' && <p role="alert">주변 음식점을 불러오지 못했어요. 위의 확인된 음식점 목록은 그대로예요.</p>}
        {nearbyView.state === 'empty' && <p>여행지에서 {PLACE_SEARCH_RADIUS_METRES / 1000}km 안에서 찾은 음식점이 없어요.</p>}
        {nearbyView.state === 'ready' && <>
          <FilterChipRow options={nearbyFoodFilter.options} selected={nearbyFoodFilter.selected} onToggle={nearbyFoodFilter.toggle} onClear={nearbyFoodFilter.clear} ariaLabel="주변 음식점 종류" />
          {nearbyFoodFilter.uncategorizedCount > 0 && !nearbyFoodFilter.showUncategorized && <p style={line}>종류가 등록되지 않은 {nearbyFoodFilter.uncategorizedCount}곳은 숨겨졌어요. <button type="button" onClick={() => nearbyFoodFilter.setShowUncategorized(true)}>함께 보기</button></p>}
          <div style={actionRow}>
            <ToggleChip pressed={nearbyLocalFilter.collapseRepeated} onClick={nearbyLocalFilter.toggle}>같은 이름이 여러 곳에 있는 가게 접어두기</ToggleChip>
          </div>
          <p style={line}>지금 결과 안에서 같은 이름이 2곳 이상 나온 가게예요. 체인인지 여부는 확인되지 않았어요.</p>
          {nearbyLocalFilter.collapseRepeated && nearbyLocalFilter.repeatedIds.size > 0 && <p style={line}>
            같은 이름 {nearbyLocalFilter.repeatedIds.size}곳 접음{' '}
            <button type="button" onClick={() => nearbyLocalFilter.setExpanded(value => !value)}>{nearbyLocalFilter.expanded ? '접기' : '펼치기'}</button>
          </p>}
          {nearbyEmptyByFood
            ? <div><p>고른 종류에 맞는 곳이 없어요.</p><div style={actionRow}><button type="button" onClick={nearbyFoodFilter.clear}>선택 지우기</button></div></div>
            : nearbyEmptyByLocal
              ? <div><p>조건에 맞는 곳이 없어요.</p><div style={actionRow}><button type="button" onClick={nearbyLocalFilter.toggle}>조건 끄기</button></div></div>
              : <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {nearbyDisplay.map(item => <DiningCard key={item.id} item={item} requestedKeys={requestedKeys} />)}
              </ul>}
        </>}
      </div>
    </>}

    <p style={line}>{DINING_EVIDENCE_NOTE}</p>
  </section>;
}
