import type { MapPickMode, RoutePoint } from "../types";

interface RoutePointPanelProps {
  origin: RoutePoint;
  pickMode: MapPickMode;
  onClose: () => void;
  onCurrentLocation: () => void;
  onSelectMode: (mode: "origin" | "destination") => void;
}

export default function RoutePointPanel({ origin, pickMode, onClose, onCurrentLocation, onSelectMode }: RoutePointPanelProps) {
  return <section id="map-panel-route" className="map-tool-panel map-side-drawer map-route-panel" aria-label="출발지와 목적지 설정" tabIndex={-1}>
    <header><div><strong>출발지 · 목적지</strong><span>현재 위치 또는 지도 클릭으로 바로 설정</span></div><button type="button" onClick={onClose} aria-label="출발지 목적지 설정 닫기">×</button></header>
    <div className="map-route-status"><span><b>S</b> 출발지</span><strong>{origin.lat.toFixed(5)}, {origin.lng.toFixed(5)}</strong></div>
    <div className="map-route-actions">
      <button type="button" onClick={onCurrentLocation}><i>◎</i><strong>현재 위치에서 출발</strong><small>위치 권한을 허용하면 지도에 표시</small></button>
      <button type="button" aria-pressed={pickMode === "origin"} className={pickMode === "origin" ? "active" : ""} onClick={() => onSelectMode("origin")}><i aria-hidden="true">S</i><strong>지도에서 출발지 선택</strong><small>지도 위 원하는 지점을 클릭</small></button>
      <button type="button" aria-pressed={pickMode === "destination"} className={pickMode === "destination" ? "active" : ""} onClick={() => onSelectMode("destination")}><i aria-hidden="true">G</i><strong>지도에서 목적지 선택</strong><small>관광지 마커도 바로 선택 가능</small></button>
    </div>
    {pickMode && <p className="map-pick-notice">지도의 원하는 지점을 클릭하세요. ESC 또는 닫기로 취소할 수 있습니다.</p>}
  </section>;
}
