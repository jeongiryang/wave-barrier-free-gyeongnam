import { useState, type CSSProperties, type FocusEvent, type RefObject } from "react";
import { safeMapImageUrl } from "../map-utils";
import type { CrowdSignal, MapPlace, MapProvider, RoutePoint } from "../types";
import { useSitePreferences } from "../../../components/SitePreferences";
import { isSupportedMapCoordinate } from "../../../lib/map-coordinates.js";
import { mapCrowdText, mapTextLanguage } from "../map-status-copy";

interface CrowdVisual {
  level: string;
  label: string;
  message: string;
  color: string;
  soft: string;
}

function revealKeyboardControl(event: FocusEvent<HTMLElement>) {
  if (event.target !== event.currentTarget && event.target.matches(":focus-visible")) event.target.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
}

interface RoadviewSelectionOverlaysProps {
  provider: MapProvider;
  roadviewSelectMode: boolean;
  roadviewPreviewOpen: boolean;
  roadviewOpen: boolean;
  selectedMapPlace: MapPlace | null;
  places: MapPlace[];
  onCancelRoadviewSelection: () => void;
  onOpenRoadview: (point: RoutePoint) => void;
}

interface MapCanvasStatusOverlaysProps {
  provider: MapProvider;
  roadviewOpen: boolean;
  roadviewMessage: string;
  roadviewLoading: boolean;
  onRetryRoadview: () => void;
  roadviewRef: RefObject<HTMLDivElement | null>;
  crowd: CrowdSignal | null | undefined;
  crowdPlace: MapPlace | undefined;
  crowdVisual: CrowdVisual | null;
  onCloseRoadview: () => void;
}

function RoadviewPlaceChoice({ places, onOpenRoadview }: Pick<RoadviewSelectionOverlaysProps, "places" | "onOpenRoadview">) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const [selectedId, setSelectedId] = useState("");
  const valid = places.filter(place => place.mapX.trim() && place.mapY.trim() && isSupportedMapCoordinate(Number(place.mapY), Number(place.mapX)));
  const selected = valid.find(place => place.id === selectedId);
  return <div className="roadview-place-choice">
    {valid.length ? <><label htmlFor="roadview-itinerary-place">{english ? "Itinerary place" : "일정 장소"}</label><select id="roadview-itinerary-place" value={selected?.id ?? ""} onChange={event => setSelectedId(event.target.value)}><option value="">{english ? "Choose a place" : "장소를 선택하세요"}</option>{valid.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select>
      <button type="button" aria-disabled={!selected} onClick={() => { if (selected) onOpenRoadview({ lat: Number(selected.mapY), lng: Number(selected.mapX) }); }}>{english ? "Open selected place Roadview" : "선택한 장소 로드뷰 열기"}</button></>
      : <p>{english ? "No itinerary place has a usable location in the supported area. Choose another place or a road on the map." : "지원 지역에서 위치를 확인할 수 있는 일정 장소가 없습니다. 다른 장소를 추가하거나 지도에서 도로를 선택해 주세요."}</p>}
  </div>;
}

export function RoadviewSelectionOverlays({ provider, roadviewSelectMode, roadviewPreviewOpen, roadviewOpen, selectedMapPlace, places, onCancelRoadviewSelection, onOpenRoadview }: RoadviewSelectionOverlaysProps) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const previewImage = safeMapImageUrl(selectedMapPlace?.image || places[0]?.image);
  return <>
    {roadviewSelectMode && <section id="map-roadview-choice" onFocusCapture={revealKeyboardControl} className="roadview-pick-banner" aria-label={english ? "Choose a Roadview location" : "로드뷰 위치 선택"}><header><div><strong>{english ? "Choose a Roadview location" : "로드뷰 위치 선택"}</strong><p>{english ? "Choose an itinerary place below, or click a road on the map." : "아래 일정 장소를 선택하거나 지도에서 도로를 클릭하세요."}</p></div><button type="button" onClick={onCancelRoadviewSelection} aria-label={english ? "Cancel Roadview selection" : "로드뷰 위치 선택 취소"}>×</button></header><RoadviewPlaceChoice places={places} onOpenRoadview={onOpenRoadview} /></section>}
    {roadviewPreviewOpen && !roadviewSelectMode && !roadviewOpen && provider === "kakao" && <aside className="roadview-hover-preview" aria-label={english ? "Roadview selection preview" : "로드뷰 위치 선택 미리보기"}>
      {previewImage && <div style={{ backgroundImage: `url("${previewImage.replace(/["\\]/g, "")}")` }} />}
      <small>{english ? "Tourism photo preview" : "관광사진 미리보기"}</small><strong>{selectedMapPlace?.name || places[0]?.name || (english ? "Choose a location" : "위치 선택")}</strong><span>{english ? "Open the location selector to choose a place or click the map." : "버튼을 누른 뒤 일정 장소를 선택하거나 지도를 클릭합니다."}</span>
    </aside>}
  </>;
}

export function MapCanvasStatusOverlays({ provider, roadviewOpen, roadviewMessage, roadviewLoading, onRetryRoadview, roadviewRef, crowd, crowdPlace, crowdVisual, onCloseRoadview }: MapCanvasStatusOverlaysProps) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const crowdText = crowdVisual ? mapCrowdText(crowdVisual, english) : null;
  return <>
    {provider === "error" && <div lang={locale} className="route-empty map-unavailable">
      <div role="status" aria-live="polite"><h3>{english ? "The map could not be loaded." : "지도를 불러오지 못했습니다."}</h3><p>{english ? "Your itinerary and journey details are still available." : "일정과 이동 구간 정보는 계속 확인할 수 있습니다."}</p></div>
      <p>{english ? "Reload this page to try the map again. Your saved itinerary is kept." : "지도를 다시 확인하려면 페이지를 새로 불러오세요. 저장한 일정은 유지됩니다."}</p>
      <button type="button" onClick={() => window.location.reload()}>{english ? "Reload page and map" : "페이지와 지도 다시 불러오기"}</button>
    </div>}
    {crowdVisual && crowdText && crowd && crowdPlace && !roadviewOpen && <aside lang={locale} className={`map-crowd-legend crowd-${crowdVisual.level}`} style={{ "--crowd-color": crowdVisual.color, "--crowd-soft": crowdVisual.soft } as CSSProperties} aria-label={english ? "Crowd forecast" : "혼잡 예측"}>
      <span className="crowd-visual"><i /></span>
      <div><small><span lang={locale}>{english ? "30-day crowd forecast" : "30일 혼잡 예측"}</span> · <span lang={mapTextLanguage(crowdPlace.name, english)}>{crowdPlace.name}</span></small><strong lang={mapTextLanguage(crowdText.label, english)}>{crowdText.label}</strong><p lang={mapTextLanguage(crowdText.message, english)}>{crowdText.message}</p></div>
      <em>{crowd.rate.toFixed(1)}%</em>
    </aside>}
    {provider === "loading" && <div lang={locale} className="map-loading-skeleton" role="status" aria-label={english ? "Connecting map" : "지도 연결 중"}><div><i /><i /><i /><span /></div><p><b />{english ? "Connecting to Kakao Maps." : "카카오 지도를 안전하게 연결하고 있습니다."}</p></div>}
    {roadviewOpen && <section id="map-roadview-panel" onFocusCapture={revealKeyboardControl} className="map-roadview-panel" aria-label={english ? "Kakao Roadview" : "카카오 로드뷰"} tabIndex={-1}>
      <header><strong>{english ? "Roadview" : "로드뷰"}</strong><button type="button" onClick={onCloseRoadview} aria-label={english ? "Close Roadview" : "로드뷰 닫기"}>×</button></header>
      <div ref={roadviewRef} />
      <footer className="roadview-feedback"><p role="status" aria-live="polite">{roadviewMessage || (english ? "Roadview initialized. Imagery does not verify an accessible route." : "로드뷰가 초기화되었습니다. 이 영상은 무장애 이동 경로를 검증하지 않습니다.")}</p><button type="button" aria-disabled={roadviewLoading} onClick={() => { if (!roadviewLoading) onRetryRoadview(); }}>{english ? "Retry Roadview" : "로드뷰 다시 시도"}</button></footer>
    </section>}
  </>;
}
