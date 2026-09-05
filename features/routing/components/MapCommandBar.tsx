"use client";

import { useSyncExternalStore } from "react";
import type { MapProvider, MapToolPanel } from "../types";

interface MapCommandBarProps {
  provider: MapProvider;
  providerDetail: string;
  baseMap: "roadmap" | "skyview";
  toolPanel: MapToolPanel;
  roadviewSelectMode: boolean;
  roadviewOpen: boolean;
  expanded: boolean;
  onRetry: () => void;
  onBaseMapChange: (value: "roadmap" | "skyview") => void;
  onToolPanelChange: (value: MapToolPanel, trigger: HTMLButtonElement) => void;
  onRoadviewSelection: (trigger: HTMLButtonElement) => void;
  onRoadviewPreviewChange: (value: boolean) => void;
  onCurrentLocation: () => void;
  onShare: () => void;
  onToggleExpanded: (trigger: HTMLButtonElement) => void;
}

export default function MapCommandBar({
  provider,
  providerDetail,
  baseMap,
  toolPanel,
  roadviewSelectMode,
  roadviewOpen,
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
  const interactive = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const togglePanel = (panel: Exclude<MapToolPanel, "place" | null>, trigger: HTMLButtonElement) => onToolPanelChange(toolPanel === panel ? null : panel, trigger);

  return <>
    <div className={`map-provider-badge ${provider}`} role="status" aria-live="polite" aria-atomic="true">
      <span aria-hidden="true" />
      <strong>{providerDetail}</strong>
      {provider === "osm" && <button type="button" onClick={onRetry}>기본 지도 다시 연결</button>}
    </div>
    <nav className="map-command-bar" aria-label="지도 기능">
      <div className="map-command-scroll">
        <div className="map-type-switch" aria-label="지도 유형">
          <button type="button" aria-pressed={baseMap === "roadmap"} className={baseMap === "roadmap" ? "active" : ""} onClick={() => onBaseMapChange("roadmap")} disabled={!interactive || provider !== "kakao"}>지도</button>
          <button type="button" aria-pressed={baseMap === "skyview"} className={baseMap === "skyview" ? "active" : ""} onClick={() => onBaseMapChange("skyview")} disabled={!interactive || provider !== "kakao"}>스카이뷰</button>
        </div>
        <button type="button" aria-expanded={toolPanel === "nearby"} aria-controls="map-panel-nearby" className={toolPanel === "nearby" ? "active" : ""} onClick={(event) => togglePanel("nearby", event.currentTarget)} disabled={!interactive || provider !== "kakao"}>⌖ 주변</button>
        <button type="button" aria-expanded={toolPanel === "route"} aria-controls="map-panel-route" className={toolPanel === "route" ? "active" : ""} onClick={(event) => togglePanel("route", event.currentTarget)} disabled={!interactive}>⇄ 출발·도착</button>
        <button type="button" aria-expanded={toolPanel === "layers"} aria-controls="map-panel-layers" className={toolPanel === "layers" ? "active" : ""} onClick={(event) => togglePanel("layers", event.currentTarget)} disabled={!interactive || provider !== "kakao"}>▱ 지도 표시</button>
        <button type="button" aria-pressed={roadviewSelectMode || roadviewOpen} aria-controls={roadviewOpen ? "map-roadview-panel" : undefined} className={roadviewSelectMode ? "active" : ""} onClick={(event) => onRoadviewSelection(event.currentTarget)} onMouseEnter={() => onRoadviewPreviewChange(true)} onMouseLeave={() => onRoadviewPreviewChange(false)} onFocus={() => onRoadviewPreviewChange(true)} onBlur={() => onRoadviewPreviewChange(false)} disabled={!interactive || provider !== "kakao"}>◉ 로드뷰</button>
        <button type="button" onClick={onCurrentLocation} disabled={!interactive}>◎ 내 위치</button>
        <button type="button" aria-expanded={toolPanel === "export"} aria-controls="map-panel-export" className={toolPanel === "export" ? "active" : ""} onClick={(event) => togglePanel("export", event.currentTarget)} disabled={!interactive}>⇩ 이미지</button>
        <button type="button" onClick={onShare} disabled={!interactive}>↗ 공유</button>
      </div>
      <button type="button" className="map-expand-button" aria-pressed={expanded} aria-controls="route-map-canvas" onClick={(event) => onToggleExpanded(event.currentTarget)} disabled={!interactive}>{expanded ? "× 닫기" : "⛶ 전체보기"}</button>
    </nav>
  </>;
}
