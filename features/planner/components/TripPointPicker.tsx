"use client";

import { useEffect, useId, useRef } from "react";
import { departurePresets } from "../constants";
import type { useLocationSearch } from "../hooks/useLocationSearch";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place } from "../types";
import { useSitePreferences } from "../../../components/SitePreferences";
import { originalLanguage } from "../place-copy";

const presetDetails: Record<string, string> = {
  changwon: "KTX and city buses", masan: "KTX and regional travel", jinju: "Western Gyeongnam",
  gimhae: "Flights and light rail", tongyeong: "Tongyeong city travel",
};

export default function TripPointPicker({ activePlaces, route, locationSearch, onChoosePoint, onClose }: {
  activePlaces: Place[];
  route: ReturnType<typeof useRoutePlanning>;
  locationSearch: ReturnType<typeof useLocationSearch>;
  onChoosePoint: (place: Place) => void;
  onClose: () => void;
}) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const { originLabel, routeDestination, loadRoutes, updateOrigin } = route;
  const {
    pointPicker, placeQuery, setPlaceQuery, placeSearchResults,
    placeSearchLoading, placeSearchState, searchLocations, searchableToPlace,
  } = locationSearch;
  const headingId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pointPicker) return;
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, pointPicker]);

  const choosePoint = (place: Place) => {
    onChoosePoint(place);
    onClose();
  };

  if (!pointPicker) return null;
  const status = placeSearchState === "loading" ? (english ? "Searching places…" : "장소를 검색하고 있습니다…")
    : placeSearchState === "error" ? (english ? "Places could not be checked. Try again or choose a public starting point or an itinerary place." : "장소를 확인하지 못했습니다. 다시 검색하거나 출발 거점·일정의 장소를 선택해 주세요.")
    : placeSearchState === "empty" ? (english ? "No places found. Change the name or try a nearby station or landmark." : "검색 결과가 없습니다. 이름을 바꾸거나 가까운 역·주요 장소로 검색해 주세요.")
    : placeSearchState === "success" ? (english ? `${placeSearchResults.length} places found. Place names and addresses may be in their original language.` : `${placeSearchResults.length}개 장소를 찾았습니다. 위치를 확인한 뒤 선택해 주세요.`)
    : (english ? "Enter at least two characters, then choose Search. Nothing is searched while you type." : "두 글자 이상 입력한 뒤 검색을 눌러 주세요. 입력 중에는 검색하지 않습니다.");
  return <section id="trip-point-picker" className="trip-point-picker" aria-labelledby={headingId}>
    <header><div><small>{pointPicker === "origin" ? (english ? "Choose departure" : "출발지 선택") : (english ? "Choose destination" : "도착지 선택")}</small><strong id={headingId}>{pointPicker === "origin" ? (english ? "Where will you start?" : "어디에서 출발할까요?") : (english ? "Where will you go?" : "어디로 이동할까요?")}</strong></div><button type="button" onClick={onClose} aria-label={english ? "Close place selection" : "선택 창 닫기"}>×</button></header>
    <div className="trip-point-comparison"><article><small>{english ? "Starting point or itinerary place" : "출발 거점 또는 일정의 장소"}</small><strong lang={originalLanguage(pointPicker === "origin" ? departurePresets[0].name : activePlaces[0]?.name || "")}>{pointPicker === "origin" ? departurePresets[0].name : activePlaces[0]?.name || (english ? "Find a place first" : "먼저 장소를 찾아주세요")}</strong><span lang={pointPicker === "destination" ? originalLanguage(activePlaces[0]?.summary || "") : undefined}>{pointPicker === "origin" ? (english ? presetDetails[departurePresets[0].id] : departurePresets[0].detail) : activePlaces[0]?.summary || (english ? "Search with your travel conditions." : "여행 조건으로 장소를 검색해 주세요.")}</span></article><article className="selected"><small>{english ? "Your selection" : "내 선택"}</small><strong lang={originalLanguage(pointPicker === "origin" ? originLabel : routeDestination?.name || "")}>{pointPicker === "origin" ? originLabel : routeDestination?.name || (english ? "Not selected yet" : "아직 선택하지 않음")}</strong><span>{pointPicker === "origin" ? (english ? "Recalculate from this point" : "선택한 위치에서 경로 재계산") : (english ? "Check routes and travel information for this place" : "선택한 장소의 경로·여행정보 확인")}</span></article></div>
    <form onSubmit={(event) => { event.preventDefault(); void searchLocations(); }}><input ref={searchInputRef} value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder={english ? "Place, station, terminal or attraction" : "장소명·역·터미널·관광지를 직접 입력"} aria-label={english ? "Search places" : "장소 검색"} /><button type="submit" disabled={placeQuery.trim().length < 2} aria-disabled={placeSearchLoading || undefined} aria-busy={placeSearchLoading || undefined}>{placeSearchLoading ? (english ? "Searching" : "검색 중") : (english ? "Search" : "검색")}</button></form>
    <p role="status">{status}</p>
    {english && <p>Public place names and descriptions may be shown in Korean.</p>}
    <div className="trip-point-list">
      {pointPicker === "origin" && departurePresets.map((item) => <button type="button" key={item.id} onClick={() => { updateOrigin(item.point, item.name); if (routeDestination || activePlaces[0]) void loadRoutes(routeDestination || activePlaces[0], item.point, false, item.name); onClose(); }}><i aria-hidden="true">S</i><span><strong lang={originalLanguage(item.name)}>{item.name}</strong><small>{english ? presetDetails[item.id] : item.detail}</small></span></button>)}
      {activePlaces.slice(0, 8).map((place, index) => <button type="button" key={`${pointPicker}-${place.id}`} onClick={() => choosePoint(place)}><i aria-hidden="true">{index + 1}</i><span><strong lang={originalLanguage(place.name)}>{place.name}</strong><small lang={originalLanguage(place.address || place.summary)}>{place.address || place.summary}</small></span>{index === 0 && <em>{english ? "In your itinerary" : "내 일정"}</em>}</button>)}
      {placeSearchResults.map((item) => <button type="button" key={`search-${item.id}`} onClick={() => choosePoint(searchableToPlace(item))}><i aria-hidden="true">⌕</i><span><strong lang={originalLanguage(item.name)}>{item.name}</strong><small lang={originalLanguage(item.address || item.category)}>{item.address || item.category}</small></span><em>{english ? "Search result" : "직접 검색"}</em></button>)}
    </div>
  </section>;
}
