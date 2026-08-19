import { departurePresets } from "../constants";
import type { useLocationSearch } from "../hooks/useLocationSearch";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place } from "../types";

export default function TripPointPicker({ activePlaces, route, locationSearch, onChoosePoint }: {
  activePlaces: Place[];
  route: ReturnType<typeof useRoutePlanning>;
  locationSearch: ReturnType<typeof useLocationSearch>;
  onChoosePoint: (place: Place) => void;
}) {
  const { originLabel, routeDestination, loadRoutes, updateOrigin } = route;
  const {
    pointPicker, setPointPicker, placeQuery, setPlaceQuery, placeSearchResults,
    placeSearchLoading, searchLocations, searchableToPlace,
  } = locationSearch;

  if (!pointPicker) return null;
  return <section className="trip-point-picker" aria-label={pointPicker === "origin" ? "출발지 선택" : "도착지 선택"}>
    <header><div><small>{pointPicker === "origin" ? "START POINT" : "DESTINATION"}</small><strong>{pointPicker === "origin" ? "어디에서 출발할까요?" : "어디로 이동할까요?"}</strong></div><button type="button" onClick={() => setPointPicker(null)} aria-label="선택 창 닫기">×</button></header>
    <div className="trip-point-comparison"><article><small>W.A.V.E 기본 추천</small><strong>{pointPicker === "origin" ? departurePresets[0].name : activePlaces[0]?.name || "검색 후 추천"}</strong><span>{pointPicker === "origin" ? departurePresets[0].detail : activePlaces[0]?.summary || "조건에 맞는 여행지를 계산합니다."}</span></article><article className="selected"><small>내 선택</small><strong>{pointPicker === "origin" ? originLabel : routeDestination?.name || "아직 선택하지 않음"}</strong><span>{pointPicker === "origin" ? "선택한 위치에서 경로 재계산" : "선택 즉시 혼잡·교통정보 갱신"}</span></article></div>
    <form onSubmit={(event) => { event.preventDefault(); void searchLocations(); }}><input value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder="장소명·역·터미널·관광지를 직접 입력" aria-label="장소 검색" /><button type="submit" disabled={placeSearchLoading || placeQuery.trim().length < 2}>{placeSearchLoading ? "검색 중" : "검색"}</button></form>
    <div className="trip-point-list">
      {pointPicker === "origin" && departurePresets.map((item) => <button type="button" key={item.id} onClick={() => { updateOrigin(item.point, item.name); if (routeDestination || activePlaces[0]) void loadRoutes(routeDestination || activePlaces[0], item.point, false, item.name); setPointPicker(null); }}><i>S</i><span><strong>{item.name}</strong><small>{item.detail}</small></span></button>)}
      {activePlaces.slice(0, 8).map((place, index) => <button type="button" key={`${pointPicker}-${place.id}`} onClick={() => onChoosePoint(place)}><i>{index + 1}</i><span><strong>{place.name}</strong><small>{place.address || place.summary}</small></span>{index === 0 && <em>W.A.V.E 추천</em>}</button>)}
      {placeSearchResults.map((item) => <button type="button" key={`search-${item.id}`} onClick={() => onChoosePoint(searchableToPlace(item))}><i>⌕</i><span><strong>{item.name}</strong><small>{item.address || item.category}</small></span><em>직접 검색</em></button>)}
      {!placeSearchLoading && placeQuery && !placeSearchResults.length && <p>검색 버튼을 누르면 입력한 값으로 실제 장소를 찾습니다.</p>}
    </div>
  </section>;
}
