import { safeMapImageUrl } from "../map-utils";
import type { MapPlace } from "../types";
import { useSitePreferences } from "../../../components/SitePreferences";
import { mapTextLanguage } from "../map-status-copy";

interface MapPlacePanelProps {
  place: MapPlace;
  onClose: () => void;
  onSetOrigin: (place: MapPlace) => void;
  onSetDestination: (place: MapPlace) => void;
}

export default function MapPlacePanel({ place, onClose, onSetOrigin, onSetDestination }: MapPlacePanelProps) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const languageOf = (text: string) => mapTextLanguage(text, english);
  const image = safeMapImageUrl(place.image);
  return <section id="map-panel-place" lang={locale} className="map-tool-panel map-side-drawer map-place-panel" aria-label={english ? "Place details" : "장소 상세 정보"} tabIndex={-1}>
    <header><div><strong>{english ? "Place information" : "관광지 정보"}</strong><span>{english ? "Select a marker to view details" : "마커를 누르면 바로 확인"}</span></div><button type="button" onClick={onClose} aria-label={english ? "Close place information" : "관광지 정보 닫기"}>×</button></header>
    {image && <div className="map-place-photo" style={{ backgroundImage: `url("${image.replace(/["\\]/g, "")}")` }} />}
    {english && <p>Names, addresses and descriptions are shown in their original language.</p>}
    <div className="map-place-copy"><small lang={languageOf(place.address || "")}>{place.address || (english ? "Gyeongsangnam-do place" : "경상남도 관광지")}</small><h3 lang={languageOf(place.name)}>{place.name}</h3>{place.summary && <p lang={languageOf(place.summary)}>{place.summary}</p>}</div>
    <div className="map-place-rating unavailable"><strong>{english ? "Check before visiting" : "방문 전 확인"}</strong><span>{english ? "This marker shows a location, not verified accessibility. Check facility details for entrances, lifts and the access you need." : "이 마커는 장소의 위치입니다. 출입구·승강기 등 편의시설과 실제 이동 가능 여부는 시설 상세에서 확인해 주세요."}</span></div>
    <div className="map-place-actions">
      <button type="button" onClick={() => onSetOrigin(place)}>{english ? "Set as departure" : "출발지로"}</button>
      <button type="button" onClick={() => onSetDestination(place)}>{english ? "Set as destination" : "목적지로"}</button>
    </div>
    <a className="map-place-review-link" href={place.placeUrl || `https://map.kakao.com/link/search/${encodeURIComponent(place.name)}`} target="_blank" rel="noreferrer">{english ? "Kakao place details and reviews ↗" : "카카오 장소 상세·후기 보기 ↗"}</a>
  </section>;
}
