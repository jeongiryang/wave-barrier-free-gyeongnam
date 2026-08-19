import { nearbyCategories } from "../constants";
import type { KakaoPlace } from "../kakao-sdk";

interface NearbyPlacesPanelProps {
  activeCategory: string | null;
  categoryMessage: string;
  categoryPlaces: KakaoPlace[];
  onClose: () => void;
  onSearch: (category: (typeof nearbyCategories)[number]) => void;
  onChoosePlace: (place: KakaoPlace) => void;
}

export default function NearbyPlacesPanel({ activeCategory, categoryMessage, categoryPlaces, onClose, onSearch, onChoosePlace }: NearbyPlacesPanelProps) {
  return <section className="map-tool-panel map-side-drawer map-nearby-panel" aria-label="주변 장소 찾기">
    <header><div><strong>주변 장소</strong><span>지도 중심 반경 10km · 거리순</span></div><button type="button" onClick={onClose} aria-label="주변 장소 닫기">×</button></header>
    <div className="map-tool-grid">{nearbyCategories.map((category) => <button type="button" key={category.id} className={activeCategory === category.id ? "active" : ""} onClick={() => onSearch(category)}><i>{category.icon}</i>{category.label}</button>)}</div>
    {(categoryMessage || categoryPlaces.length > 0) && <div className="map-poi-results" aria-live="polite">
      <div className="map-results-heading"><strong>{nearbyCategories.find((item) => item.id === activeCategory)?.label || "검색 결과"}</strong><span>{categoryMessage}</span></div>
      <div className="map-poi-list">{categoryPlaces.slice(0, 12).map((place) => <article key={place.id}>
        <div><strong>{place.place_name}</strong><span>{place.road_address_name || place.address_name}</span></div>
        <small>{place.distance ? `${Number(place.distance).toLocaleString()}m` : "거리 정보 없음"}</small>
        <button type="button" onClick={() => onChoosePlace(place)}>지도에서 보기</button>
        {place.place_url && <a href={place.place_url} target="_blank" rel="noreferrer">장소 상세·후기 ↗</a>}
      </article>)}</div>
    </div>}
  </section>;
}
