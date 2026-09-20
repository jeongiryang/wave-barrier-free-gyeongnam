import type { FacilityLayerSelection } from "../../../lib/facility-layers";
import type { FacilityMapMarker } from "../types";
import { FACILITY_LAYER_LIMIT, derivedFacilityLayers, facilityLayers, officialFacilityLayers, placeSearchFacilityLayers, type FacilityLayer } from "../constants";
import type { FacilityLayerState } from "../useFacilityLayers";
import { useSitePreferences } from "../../../components/SitePreferences";

const englishLabels: Record<string, string> = {
  food: "Restaurants", cafe: "Cafes", store: "Convenience stores",
  pharmacy: "Pharmacies", hospital: "Hospitals", subway: "Subway stations",
  "helpdog-confirmed": "Guide dog access confirmed",
  "braileblock-confirmed": "Tactile paving confirmed",
  "low-floor-bus-arrival": "Low-floor buses confirmed now",
};
const layerName = (layer: FacilityLayer, english: boolean) => english ? englishLabels[layer.id] || layer.label : layer.label;

/** 켜짐을 색으로만 알리지 않는다. 체크 표시를 함께 그린다. */
function CheckMark() {
  return <svg className="facility-check" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
    <path d="M2.5 8.6l3.4 3.4 7.6-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

interface FacilityLayerPanelProps {
  available: boolean;
  loading: boolean;
  selection: FacilityLayerSelection;
  layerStates: Record<string, FacilityLayerState>;
  notice: string;
  selectedFacility: FacilityMapMarker | null;
  onClose: () => void;
  onToggleLayer: (id: string) => void;
  onRetryLayer: (id: string) => void;
  onClearAll: () => void;
  onCloseFacility: () => void;
  onShowOnMap: (marker: FacilityMapMarker) => void;
  onSetDestination: (marker: FacilityMapMarker) => void;
}

export default function FacilityLayerPanel({
  available, loading, selection, layerStates, notice, selectedFacility,
  onClose, onToggleLayer, onRetryLayer, onClearAll, onCloseFacility, onShowOnMap, onSetDestination,
}: FacilityLayerPanelProps) {
  const english = useSitePreferences().locale === "en";
  const active = selection.active;

  const renderGroup = (layers: readonly FacilityLayer[]) => <div className="map-tool-grid">
    {layers.map((layer) => {
      const on = active.includes(layer.id);
      return <button
        key={layer.id}
        type="button"
        aria-disabled={!available}
        aria-pressed={on}
        className={on ? "active" : ""}
        onClick={() => { if (available) onToggleLayer(layer.id); }}
      >
        <i aria-hidden="true">{layer.glyph}</i>
        {layerName(layer, english)}
        {on && <CheckMark />}
      </button>;
    })}
  </div>;

  return <section id="map-panel-facility" className="map-tool-panel map-side-drawer map-facility-panel" role="region" aria-label={english ? "Show facilities on the map" : "편의 표시"} tabIndex={-1} onFocusCapture={(event) => {
    if (event.target !== event.currentTarget && event.target.matches(":focus-visible")) event.target.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  }}>
    <header>
      <div>
        <strong>{english ? "Show facilities" : "편의 표시"}</strong>
        <span>{english ? `Up to ${FACILITY_LAYER_LIMIT} at once · within 10 km of the map centre` : `한 번에 ${FACILITY_LAYER_LIMIT}개까지 · 지도 중심 반경 10km`}</span>
      </div>
      <button type="button" onClick={onClose} aria-label={english ? "Close facility display" : "편의 표시 닫기"}>×</button>
    </header>

    {!available && <p role="status" aria-live="polite">{loading
      ? (english ? "Preparing the map. Choose facilities when it is ready." : "지도를 준비하고 있어요. 준비되면 편의 항목을 선택해 주세요.")
      : (english ? "Reconnect the main map to show facilities." : "기본 지도를 다시 연결하면 편의 시설을 표시할 수 있어요.")}</p>}

    {active.length === 0
      ? <p>{english ? "Nothing is shown yet. Choose a facility below." : "아직 켠 항목이 없어요. 아래에서 골라주세요."}</p>
      : <ul aria-label={english ? "Facilities shown now" : "지금 켠 편의 항목"}>{active.map((id) => {
          const layer = facilityLayers.find((item) => item.id === id);
          const failed = selection.failed.includes(id);
          const state = layerStates[id];
          return <li key={id} className={failed ? "facility-chip failed" : "facility-chip"}>
            <span>{layer ? layerName(layer, english) : id}</span>
            {state === "loading" && <small>{english ? "Loading" : "불러오는 중"}</small>}
            {state === "empty" && <small>{english ? "No confirmed arrivals right now" : layer?.emptyLabel || "검색 결과 없음"}</small>}
            {failed && <><small>{english ? "Could not load" : "불러오지 못함"}</small>
              <button type="button" onClick={() => onRetryLayer(id)}>{english ? "Try again" : "다시 시도"}</button></>}
            <button type="button" onClick={() => onToggleLayer(id)} aria-label={english ? `Turn off ${layer ? layerName(layer, english) : id}` : `${layer ? layer.label : id} 끄기`}>×</button>
          </li>;
        })}
        <li><button type="button" className="facility-clear-all" onClick={onClearAll}>{english ? "Turn all off" : "모두 끄기"}</button></li>
      </ul>}

    <p className="facility-notice" role="status" aria-live="polite" aria-atomic="true">{notice}</p>

    <h4>{english ? "Place search" : "장소 검색"}</h4>
    {renderGroup(placeSearchFacilityLayers)}

    {/* 등록된 공식 데이터 레이어가 하나도 없으면 이 구분 자체를 그리지 않는다.
        빈 목록을 보여 주면 확인된 정보가 있는 것처럼 읽히기 때문이다. */}
    {officialFacilityLayers.length > 0 && <>
      <h4>{english ? "Official public data" : "공식 공공데이터"}</h4>
      {renderGroup(officialFacilityLayers)}
    </>}

    {/* 새 조회 없이 이미 받아온 장소 목록에서 뽑은 레이어(스펙 20). */}
    {derivedFacilityLayers.length > 0 && <>
      <h4>{english ? "Already checked" : "이미 확인된 곳"}</h4>
      {renderGroup(derivedFacilityLayers)}
    </>}

    {/* 범례는 글자로만 제공한다. 색을 보지 못해도 종류를 알 수 있어야 한다. */}
    <h4>{english ? "Marker legend" : "마커 범례"}</h4>
    <p>{english
      ? "Place search results use a round pin. Official public data and facilities already confirmed in the trip's place list use a square outlined pin."
      : "장소 검색 결과는 동그란 핀이에요. 공식 공공데이터와 여행지 목록에서 이미 확인된 정보는 테두리가 있는 사각 핀으로 구분해요."}</p>
    <p>{english
      ? "Each pin carries a letter for its facility type, and a marker is read as “{layer name} {facility name}”."
      : "핀 안의 글자가 시설 종류를 나타내고, 마커는 “{레이어 이름} {시설 이름}”으로 읽혀요."}</p>

    {selectedFacility && <article className="facility-card" aria-label={english ? "Selected facility" : "선택한 편의시설"}>
      <header>
        <div>
          <strong>{selectedFacility.name}</strong>
          <span>{selectedFacility.address || (english ? "Address unavailable" : "주소 정보 없음")}</span>
        </div>
        <button type="button" onClick={onCloseFacility} aria-label={english ? "Close facility card" : "편의시설 정보 닫기"}>×</button>
      </header>
      <dl>
        <div><dt>{english ? "Distance from the map centre" : "지도 중심에서 거리"}</dt><dd>{typeof selectedFacility.distanceMeters === "number" ? `${selectedFacility.distanceMeters.toLocaleString(english ? "en" : "ko")}m` : (english ? "Unavailable" : "정보 없음")}</dd></div>
        <div><dt>{english ? "Source" : "제공처"}</dt><dd>{selectedFacility.source}</dd></div>
        {selectedFacility.referenceDate && <div><dt>{english ? "Data reference date" : "데이터 기준일"}</dt><dd>{selectedFacility.referenceDate}</dd></div>}
      </dl>
      {selectedFacility.official && selectedFacility.detail && <p>{selectedFacility.detail}</p>}
      <div className="map-place-actions">
        <button type="button" onClick={() => onShowOnMap(selectedFacility)}>{english ? "View on map" : "지도에서 보기"}</button>
        <button type="button" onClick={() => onSetDestination(selectedFacility)}>{english ? "Set as destination" : "도착지로 선택"}</button>
      </div>
    </article>}

    <p className="facility-evidence">{english
      ? "These facilities come from public data records. Real-time availability and on-site conditions have not been checked."
      : "표시된 편의시설은 공공데이터에 등록된 정보예요. 실시간 이용 가능 여부와 현장 상태는 확인되지 않았어요."}</p>
  </section>;
}
