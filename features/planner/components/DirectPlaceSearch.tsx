"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { canonicalPublicPlace, conflictingFacilities } from "../../../lib/place-identity";
import { Spinner } from "../../../components/LoadingState";
import { regions } from "../constants";
import { useLocationSearchRequest } from "../hooks/useLocationSearchRequest";
import type { Place, SearchPlace, SearchPlaceType } from "../types";
import type { useTripSelection } from "../hooks/useTripSelection";

const typeLabel: Record<SearchPlaceType, string> = { region: "지역", tourism: "관광지", cafe: "카페", restaurant: "식당", other: "기타 장소" };

type Result = { kind: "region"; id: string; name: string } | { kind: "place"; item: SearchPlace; place: Place; official: boolean; conflicts: string[] };

export default function DirectPlaceSearch({ region, trip, onRegionSelect, officialPlaces = [], profiles = [], onPlace }: {
  officialPlaces?: Place[]; profiles?: string[]; onPlace?: (place: Place) => void;
  region: string;
  trip: ReturnType<typeof useTripSelection>;
  onRegionSelect: (region: string) => void;
  onBuildItinerary: () => void;
}) {
  const search = useLocationSearchRequest(region, "gyeongnam", profiles);
  const { setPlaceQuery, searchLocations } = search;
  const [active, setActive] = useState(-1);
  useEffect(() => {
    const find = (event: Event) => { const query = (event as CustomEvent<unknown>).detail; if (typeof query !== 'string' || query.length > 250) return; setPlaceQuery(query); setActive(-1); void searchLocations(query); };
    window.addEventListener('wave:search-official-candidate', find);
    return () => window.removeEventListener('wave:search-official-candidate', find);
  }, [setPlaceQuery, searchLocations]);
  const resultNodes = useRef<Array<HTMLElement | null>>([]);
  const matchingRegions = useMemo(() => {
    const query = search.placeQuery.trim().replace(/^(경상남도|경남)\s*/, "");
    if (query.length < 1) return [];
    return regions.filter(item => item !== "경남 전체" && item.includes(query)).slice(0, 3);
  }, [search.placeQuery]);
  const results = useMemo<Result[]>(() => [
    ...matchingRegions.map(name => ({ kind: "region" as const, id: `region-${name}`, name })),
    ...search.placeSearchResults.map(item => {
      const canonical = canonicalPublicPlace(item, [...officialPlaces, ...search.officialPlaces.filter(place => place.facilityLookupState !== 'error' || !officialPlaces.some(previous => previous.id === place.id))]);
      const previous = canonicalPublicPlace(item, officialPlaces);
      const fresh = canonicalPublicPlace(item, search.officialPlaces);
      return { kind: "place" as const, item, place: canonical || search.searchableToPlace(item), official: Boolean(canonical), conflicts: previous && fresh ? conflictingFacilities(previous, fresh) : [] };
    }).sort((a,b) => Number(b.official) - Number(a.official) || Number(b.item.resultType === 'tourism') - Number(a.item.resultType === 'tourism')),
  ], [matchingRegions, search, officialPlaces]);

  const submit = (event?: FormEvent) => { event?.preventDefault(); setActive(-1); void search.searchLocations(); };
  const choose = (result: Result) => {
    if (result.kind === "region") { onRegionSelect(result.name); search.clearSearchRequest(); return; }
    const node = resultNodes.current[results.indexOf(result)];
    node?.querySelector<HTMLElement>("a,button")?.focus();
  };
  const keydown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { event.preventDefault(); setActive(-1); search.clearSearchRequest(); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!results.length) return;
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActive(current => current < 0 ? (direction > 0 ? 0 : results.length - 1) : (current + direction + results.length) % results.length);
      return;
    }
    if (event.key === "Enter" && active >= 0 && results[active]) { event.preventDefault(); choose(results[active]); }
  };

  const showResults = results.length > 0 && (search.placeSearchState !== "idle" || matchingRegions.length > 0);
  return <section className="simple-direct-search" aria-labelledby="direct-place-search-title">
    <div className="simple-direct-search-heading"><div><h2 id="direct-place-search-title" className="sr-only">여행지 검색</h2></div></div>
    <form className="simple-search-bar simple-direct-search-form" role="search" onSubmit={submit}>
      <label htmlFor="direct-place-query"><span>여행지 검색</span><input id="direct-place-query" type="search" role="combobox" aria-label="여행지 검색" value={search.placeQuery} placeholder="예: 통영 케이블카, 창원 카페" autoComplete="off" aria-autocomplete="list" aria-controls="direct-place-results" aria-expanded={showResults} aria-activedescendant={active >= 0 ? `direct-result-${active}` : undefined} onChange={event => { search.setPlaceQuery(event.target.value); setActive(-1); }} onKeyDown={keydown} /></label>
      <button type="submit" className="simple-direct-search-submit" disabled={search.placeQuery.trim().length < 2 || search.placeSearchLoading}>{search.placeSearchLoading ? <><Spinner />찾는 중</> : "검색"}</button>
    </form>
    {search.placeSearchState === "error" && <p className="simple-empty" role="alert">검색 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요</p>}
    {search.placeSearchState === "empty" && !matchingRegions.length && <p className="simple-empty" role="status">경남에서 일치하는 장소를 찾지 못했어요. 지역이나 상호명을 바꿔 보세요</p>}
    {search.officialState === 'error' && <p role="status">공식 관광정보 일부를 조회하지 못했어요. 확인된 기존 근거는 유지하며 나머지 편의는 미확인입니다.</p>}
    {showResults && <div id="direct-place-results" className="simple-place-list" role="list" aria-label="직접 검색 결과">
      {results.map((result, index) => result.kind === "region" ? <article ref={node => { resultNodes.current[index] = node; }} id={`direct-result-${index}`} key={result.id} className="simple-result-notice simple-direct-region" role="listitem" data-active={active === index}>
        <div><span>지역</span><h3>{result.name}</h3><p>{result.name}의 관광지와 편의정보를 살펴봐요</p></div><button type="button" className="simple-text-link" onClick={() => choose(result)}>이 지역으로 바꾸기</button>
      </article> : <article ref={node => { resultNodes.current[index] = node; }} id={`direct-result-${index}`} key={result.item.id} className="simple-place-row simple-direct-place" role="listitem" data-active={active === index}>
        {result.official && result.place.image ? <div className="simple-place-photo"><Image src={result.place.image} alt={`${result.place.name} 공식 관광정보 사진`} fill sizes="(max-width:600px) 96px,160px" unoptimized /></div> : <div className="simple-place-photo simple-search-photo-placeholder" role="img" aria-label={`${result.item.name} 사진 없음`}>사진 없음</div>}
        <div className="simple-place-copy"><span className="simple-place-city">{result.item.region || "경남"} · {typeLabel[result.item.resultType || "other"]}</span><h3>{result.official && onPlace ? <button type="button" className="simple-text-link" onClick={() => onPlace(result.place)}>{result.place.name}</button> : result.item.placeUrl ? <a href={result.item.placeUrl} target="_blank" rel="noreferrer">{result.item.name}<span className="sr-only"> 새 창</span></a> : result.item.name}</h3><p className="simple-place-address">{result.item.address || "주소 미제공"}</p><p className="simple-search-summary">{result.item.summary || result.item.category || ""}</p><dl className="simple-search-facts"><div><dt>운영시간</dt><dd>미확인</dd></div><div><dt>이동</dt><dd>일정에 담으면 경로 확인</dd></div><div><dt>편의·접근성</dt><dd>{result.official ? result.place.accessibility?.length ? result.place.accessibility.map(item => `${item.label} ${item.state === 'confirmed' ? '확인됨' : item.state === 'negative' ? '없음으로 기록' : '미확인'}`).join(' · ') : '항목별 정보 미확인' : '공식 관광정보 연결 미확인 · 시설은 별도 확인'}</dd></div></dl>{result.conflicts.length > 0 && <p role="status">공식 조회 시점 간 정보 불일치: {result.conflicts.join(" · ")}. 최근 공식 조회를 표시했어요. 기존 추천과 다른 항목은 방문 전에 확인해 주세요.</p>}{result.official && <p className="simple-search-summary">{result.place.source}{result.place.facilityLookupState === 'error' ? ' · 편의정보 제공처 조회 실패' : ''}</p>}</div>
        <button type="button" className="simple-place-add" disabled={!trip.storageReady} aria-pressed={trip.saved.includes(result.place.id)} onClick={() => trip.toggleSaved(result.place.id, result.place)} aria-label={`${result.item.name} ${trip.saved.includes(result.place.id) ? "담았음 · 되돌리기" : "일정에 담기"}`}><span aria-hidden="true">{trip.saved.includes(result.place.id) ? "↶" : "+"}</span>{trip.saved.includes(result.place.id) ? "되돌리기" : "담기"}</button>
      </article>)}
    </div>}
  </section>;
}
