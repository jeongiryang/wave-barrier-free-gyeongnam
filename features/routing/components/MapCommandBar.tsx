import type { MapProvider, MapToolPanel } from "../types";

interface MapCommandBarProps {
  provider: MapProvider;
  providerDetail: string;
  baseMap: "roadmap" | "skyview";
  toolPanel: MapToolPanel;
  roadviewSelectMode: boolean;
  expanded: boolean;
  onRetry: () => void;
  onBaseMapChange: (value: "roadmap" | "skyview") => void;
  onToolPanelChange: (value: MapToolPanel) => void;
  onRoadviewSelection: () => void;
  onRoadviewPreviewChange: (value: boolean) => void;
  onCurrentLocation: () => void;
  onShare: () => void;
  onToggleExpanded: () => void;
}

export default function MapCommandBar({
  provider,
  providerDetail,
  baseMap,
  toolPanel,
  roadviewSelectMode,
  expanded,
  onRetry,
  onBaseMapChange,
  onToolPanelChange,
  onRoadviewSelection,
  onRoadviewPreviewChange,
  onCurrentLocation,
  onShare,
  onToggleExpanded,
}: MapCommandBarProps) {
  const togglePanel = (panel: Exclude<MapToolPanel, "place" | null>) => onToolPanelChange(toolPanel === panel ? null : panel);

  return <>
    <div className={`map-provider-badge ${provider}`} title={providerDetail}><span />{provider === "kakao" ? "Kakao Map" : provider === "osm" ? "대체 지도" : "지도 연결 중"}{provider === "osm" && <button type="button" onClick={onRetry}>Kakao 재연결</button>}</div>
    <nav className="map-command-bar" aria-label="지도 기능">
      <div className="map-command-scroll">
        <div className="map-type-switch" aria-label="지도 유형">
          <button type="button" className={baseMap === "roadmap" ? "active" : ""} onClick={() => onBaseMapChange("roadmap")} disabled={provider !== "kakao"}>지도</button>
          <button type="button" className={baseMap === "skyview" ? "active" : ""} onClick={() => onBaseMapChange("skyview")} disabled={provider !== "kakao"}>스카이뷰</button>
        </div>
        <button type="button" className={toolPanel === "nearby" ? "active" : ""} onClick={() => togglePanel("nearby")} disabled={provider !== "kakao"}>⌖ 주변</button>
        <button type="button" className={toolPanel === "route" ? "active" : ""} onClick={() => togglePanel("route")}>⇄ 출발·도착</button>
        <button type="button" className={toolPanel === "layers" ? "active" : ""} onClick={() => togglePanel("layers")} disabled={provider !== "kakao"}>▱ 레이어·측정</button>
        <button type="button" className={roadviewSelectMode ? "active" : ""} onClick={onRoadviewSelection} onMouseEnter={() => onRoadviewPreviewChange(true)} onMouseLeave={() => onRoadviewPreviewChange(false)} onFocus={() => onRoadviewPreviewChange(true)} onBlur={() => onRoadviewPreviewChange(false)} disabled={provider !== "kakao"}>◉ 로드뷰</button>
        <button type="button" onClick={onCurrentLocation}>◎ 내 위치</button>
        <button type="button" className={toolPanel === "export" ? "active" : ""} onClick={() => togglePanel("export")}>⇩ 이미지</button>
        <button type="button" onClick={onShare}>↗ 공유</button>
      </div>
      <button type="button" className="map-expand-button" onClick={onToggleExpanded}>{expanded ? "× 닫기" : "⛶ 전체보기"}</button>
    </nav>
  </>;
}
