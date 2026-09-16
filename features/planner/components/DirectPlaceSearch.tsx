"use client";

import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Spinner } from "../../../components/LoadingState";
import { regions } from "../constants";
import { useLocationSearchRequest } from "../hooks/useLocationSearchRequest";
import type { Place, SearchPlace, SearchPlaceType } from "../types";
import type { useTripSelection } from "../hooks/useTripSelection";

const typeLabel: Record<SearchPlaceType, string> = { region: "지역", tourism: "관광지", cafe: "카페", restaurant: "식당", other: "기타 장소" };

type Result = { kind: "region"; id: string; name: string } | { kind: "place"; item: SearchPlace; place: Place };

export default function DirectPlaceSearch({ region, trip, onRegionSelect, onBuildItinerary }: {
  region: string;
  trip: ReturnType<typeof useTripSelection>;
  onRegionSelect: (region: string) => void;
  onBuildItinerary: () => void;
}) {
  const search = useLocationSearchRequest(region, "gyeongnam");
  const [active, setActive] = useState(-1);
  const resultNodes = useRef<Array<HTMLElement | null>>([]);
  const matchingRegions = useMemo(() => {
    const query = search.placeQuery.trim().replace(/^(경상남도|경남)\s*/, "");
    if (query.length < 1) return [];
    return regions.filter(item => item !== "경남 전체" && item.includes(query)).slice(0, 3);
  }, [search.placeQuery]);
  const results = useMemo<Result[]>(() => [
    ...matchingRegions.map(name => ({ kind: "region" as const, id: `region-${name}`, name })),
    ...search.placeSearchResults.map(item => ({ kind: "place" as const, item, place: search.searchableToPlace(item) })),
  ], [matchingRegions, search]);

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
    <div className="simple-results-heading simple-direct-search-heading"><div><h2 id="direct-place-search-title">이름으로 바로 찾기</h2><p>지역·관광지·카페·음식점 이름을 검색할 수 있어요</p></div>{trip.orderedSavedPlaces.length > 0 && <button type="button" className="simple-text-link simple-load-itinerary" onClick={onBuildItinerary}>담은 여행으로 일정 짜기</button>}</div>
    <form className="simple-search-bar simple-direct-search-form" role="search" onSubmit={submit}>
      <label htmlFor="direct-place-query"><span>여행지 검색</span><input id="direct-place-query" type="search" role="combobox" value={search.placeQuery} placeholder="예: 통영 케이블카, 창원 카페" autoComplete="off" aria-autocomplete="list" aria-controls="direct-place-results" aria-expanded={showResults} aria-activedescendant={active >= 0 ? `direct-result-${active}` : undefined} onChange={event => { search.setPlaceQuery(event.target.value); setActive(-1); }} onKeyDown={keydown} /></label>
      <button type="submit" className="simple-facility-trigger" disabled={search.placeQuery.trim().length < 2 || search.placeSearchLoading}>{search.placeSearchLoading ? <><Spinner />찾는 중</> : "검색"}</button>
    </form>
    {search.placeSearchState === "error" && <p className="simple-empty" role="alert">검색 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요</p>}
    {search.placeSearchState === "empty" && !matchingRegions.length && <p className="simple-empty" role="status">경남에서 일치하는 장소를 찾지 못했어요. 지역이나 상호명을 바꿔 보세요</p>}
    {showResults && <div id="direct-place-results" className="simple-place-list" role="list" aria-label="직접 검색 결과">
      {results.map((result, index) => result.kind === "region" ? <article ref={node => { resultNodes.current[index] = node; }} id={`direct-result-${index}`} key={result.id} className="simple-result-notice simple-direct-region" role="listitem" data-active={active === index}>
        <div><span>지역</span><h3>{result.name}</h3><p>{result.name}의 관광지와 편의정보를 살펴봐요</p></div><button type="button" className="simple-text-link" onClick={() => choose(result)}>이 지역으로 바꾸기</button>
      </article> : <article ref={node => { resultNodes.current[index] = node; }} id={`direct-result-${index}`} key={result.item.id} className="simple-place-row simple-direct-place" role="listitem" data-active={active === index}>
        <div className="simple-place-photo simple-search-photo-placeholder" role="img" aria-label={`${result.item.name} 사진 정보 확인 중`}>사진<br/>정보 확인 중</div>
        <div className="simple-place-copy"><span className="simple-place-city">{result.item.region || "경남"} · {typeLabel[result.item.resultType || "other"]}</span><h3>{result.item.placeUrl ? <a href={result.item.placeUrl} target="_blank" rel="noreferrer">{result.item.name}<span className="sr-only"> 새 창</span></a> : result.item.name}</h3><p className="simple-place-address">{result.item.address || "주소 정보 확인 중"}</p><p className="simple-search-summary">{result.item.summary || result.item.category || "장소 설명 정보 확인 중"}</p><dl className="simple-search-facts"><div><dt>운영시간</dt><dd>정보 확인 중</dd></div><div><dt>이동</dt><dd>일정에 담으면 경로 확인</dd></div><div><dt>편의·접근성</dt><dd>정보 확인 중</dd></div></dl></div>
        <button type="button" className="simple-place-add" disabled={!trip.storageReady} aria-pressed={trip.saved.includes(result.place.id)} onClick={() => trip.toggleSaved(result.place.id, result.place)} aria-label={`${result.item.name} ${trip.saved.includes(result.place.id) ? "담았음 · 되돌리기" : "일정에 담기"}`}><span aria-hidden="true">{trip.saved.includes(result.place.id) ? "↶" : "+"}</span>{trip.saved.includes(result.place.id) ? "되돌리기" : "담기"}</button>
      </article>)}
    </div>}
  </section>;
}
