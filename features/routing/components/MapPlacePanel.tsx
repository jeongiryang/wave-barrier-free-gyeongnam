import { safeMapImageUrl } from "../map-utils";
import type { MapPlace } from "../types";

interface MapPlacePanelProps {
  place: MapPlace;
  onClose: () => void;
  onSetOrigin: (place: MapPlace) => void;
  onSetDestination: (place: MapPlace) => void;
}

export default function MapPlacePanel({ place, onClose, onSetOrigin, onSetDestination }: MapPlacePanelProps) {
  const image = safeMapImageUrl(place.image);
  return <section id="map-panel-place" className="map-tool-panel map-side-drawer map-place-panel" aria-label={`${place.name} 상세 정보`} tabIndex={-1}>
    <header><div><strong>관광지 정보</strong><span>마커를 누르면 바로 확인</span></div><button type="button" onClick={onClose} aria-label="관광지 정보 닫기">×</button></header>
    {image && <div className="map-place-photo" style={{ backgroundImage: `url("${image.replace(/["\\]/g, "")}")` }} />}
    <div className="map-place-copy"><small>{place.address || "경상남도 관광지"}</small><h3>{place.name}</h3>{place.summary && <p>{place.summary}</p>}</div>
    {place.score !== null ? <div className="map-place-rating"><strong>{place.score}%</strong><span>선택한 편의조건 중 공식 데이터 일치율</span></div> : <div className="map-place-rating unavailable"><strong>판단 보류</strong><span>공식 편의정보가 없어 숫자로 평가하지 않습니다.</span></div>}
    <div className="map-place-actions">
      <button type="button" onClick={() => onSetOrigin(place)}>출발지로</button>
      <button type="button" onClick={() => onSetDestination(place)}>목적지로</button>
    </div>
    <a className="map-place-review-link" href={place.placeUrl || `https://map.kakao.com/link/search/${encodeURIComponent(place.name)}`} target="_blank" rel="noreferrer">카카오 장소 상세·후기 보기 ↗</a>
  </section>;
}
