import { nearbyCategories } from "../constants";
import type { KakaoPlace } from "../kakao-sdk";
import { nearbyCategoryLabel } from "../nearby-place-data";
import { useSitePreferences } from "../../../components/SitePreferences";

interface NearbyPlacesPanelProps {
  activeCategory: string | null;
  categoryMessage: string;
  categoryPlaces: KakaoPlace[];
  categoryState: "idle" | "loading" | "success" | "empty" | "error";
  onClose: () => void;
  onSearch: (category: (typeof nearbyCategories)[number]) => void;
  onChoosePlace: (place: KakaoPlace) => void;
  onRetry: () => void;
}

export default function NearbyPlacesPanel({ activeCategory, categoryMessage, categoryPlaces, categoryState, onClose, onSearch, onChoosePlace, onRetry }: NearbyPlacesPanelProps) {
  const english = useSitePreferences().locale === "en";
  const category = nearbyCategories.find((item) => item.id === activeCategory);
  return <section id="map-panel-nearby" className="map-tool-panel map-side-drawer map-nearby-panel" aria-label={english ? "Find nearby places" : "주변 장소 찾기"} tabIndex={-1} onFocusCapture={(event) => {
    // Keep keyboard targets clear of the drawer header and the fixed journey navigation.
    if (event.target !== event.currentTarget && event.target.matches(":focus-visible")) event.target.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  }}>
    <header><div><strong>{english ? "Nearby places" : "주변 장소"}</strong><span>{english ? "Within 10 km of the map centre when searched · by distance" : "검색 당시 지도 중심 반경 10km · 거리순"}</span></div><button type="button" onClick={onClose} aria-label={english ? "Close nearby places" : "주변 장소 닫기"}>×</button></header>
    <p>{english ? "Choose a category to search. Names and addresses are supplied in their original language. Check the facilities you need before visiting." : "분류를 선택하면 검색합니다. 필요한 편의시설은 방문 전에 별도로 확인해 주세요."}</p>
    <div className="map-tool-grid">{nearbyCategories.map((category) => <button type="button" key={category.id} aria-pressed={activeCategory === category.id} className={activeCategory === category.id ? "active" : ""} onClick={() => onSearch(category)}><i aria-hidden="true">{category.icon}</i>{nearbyCategoryLabel(category, english)}</button>)}</div>
    {(categoryMessage || categoryPlaces.length > 0) && <div className="map-poi-results">
      <div className="map-results-heading"><strong>{category ? nearbyCategoryLabel(category, english) : (english ? "Search results" : "검색 결과")}</strong><span role="status" aria-live="polite" aria-atomic="true">{categoryMessage}</span></div>
      <button type="button" aria-disabled={categoryState === "loading"} onClick={() => { if (categoryState !== "loading") onRetry(); }}>{english ? "Search nearby again" : "주변 장소 다시 검색"}</button>
      <div className="map-poi-list" aria-busy={categoryState === "loading"}>{categoryPlaces.map((place) => <article key={place.id}>
        <div><strong>{place.place_name}</strong><span>{place.road_address_name || place.address_name || (english ? "Address unavailable" : "주소 정보 없음")}</span></div>
        <small>{place.distance ? `${Number(place.distance).toLocaleString(english ? "en" : "ko")}m` : (english ? "Distance unavailable" : "거리 정보 없음")}</small>
        <button type="button" onClick={() => onChoosePlace(place)}>{english ? "View on map" : "지도에서 보기"}</button>
        {place.place_url && <a href={place.place_url} target="_blank" rel="noreferrer">{english ? "Place details and reviews ↗" : "장소 상세·후기 ↗"}</a>}
      </article>)}</div>
    </div>}
  </section>;
}
