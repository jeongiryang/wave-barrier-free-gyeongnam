"use client";

import { useSyncExternalStore } from "react";
import type { MapProvider, MapToolPanel } from "../types";
import { useSitePreferences } from "../../../components/SitePreferences";
import { mapStatusText } from "../map-status-copy";

interface MapCommandBarProps {
  provider: MapProvider;
  providerDetail: string;
  actionNotice: string;
  actionPending: boolean;
  baseMap: "roadmap" | "skyview";
  layerError: boolean;
  layerRecovery: boolean;
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
  actionNotice,
  actionPending,
  baseMap,
  layerError,
  layerRecovery,
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
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const togglePanel = (panel: Exclude<MapToolPanel, "place" | null>, trigger: HTMLButtonElement) => onToolPanelChange(toolPanel === panel ? null : panel, trigger);
  let statusMessage = actionNotice || mapStatusText(providerDetail, english);
  if (provider === "error") statusMessage = english ? "The map could not be loaded." : "지도를 불러오지 못했습니다.";
  else if (layerRecovery && provider === "loading") statusMessage = english ? "Applying map settings…" : "지도 설정을 다시 적용하고 있습니다.";
  else if (layerError) statusMessage = english ? "The map settings could not be confirmed. Reload the map to apply your choices again." : "지도 설정의 적용 여부를 확인할 수 없습니다. 지도를 다시 불러와 선택한 설정을 적용해 주세요.";
  else if (layerRecovery && provider === "kakao" && !actionNotice) statusMessage = english ? "Map settings applied." : "지도 설정을 적용했습니다.";

  return <>
    <div className={`map-provider-badge ${provider}${layerRecovery ? " map-layer-status" : ""}`} role="status" aria-live="polite" aria-atomic="true">
      <span aria-hidden="true" />
      <strong style={{ whiteSpace: "normal" }}>{statusMessage}</strong>
      {(provider === "osm" || layerRecovery) && <button type="button" aria-disabled={provider === "loading"} onClick={() => { if (provider !== "loading") onRetry(); }}>{layerRecovery ? (locale === "en" ? "Reapply map settings" : "지도 설정 다시 적용") : (locale === "en" ? "Reconnect the main map" : "기본 지도 다시 연결")}</button>}
    </div>
    <nav className="map-command-bar" aria-label={english ? "Map tools" : "지도 기능"}>
      <div className="map-command-scroll">
        <div className="map-type-switch" aria-label={english ? "Map type" : "지도 유형"}>
          <button type="button" aria-pressed={baseMap === "roadmap"} className={baseMap === "roadmap" ? "active" : ""} onClick={() => onBaseMapChange("roadmap")} disabled={!interactive || provider !== "kakao"}>{english ? "Map" : "지도"}</button>
          <button type="button" aria-pressed={baseMap === "skyview"} className={baseMap === "skyview" ? "active" : ""} onClick={() => onBaseMapChange("skyview")} disabled={!interactive || provider !== "kakao"}>{english ? "Skyview" : "스카이뷰"}</button>
        </div>
        <button type="button" aria-expanded={toolPanel === "nearby"} aria-controls="map-panel-nearby" className={toolPanel === "nearby" ? "active" : ""} onClick={(event) => togglePanel("nearby", event.currentTarget)} disabled={!interactive || provider !== "kakao"}>{locale === "en" ? "⌖ Nearby" : "⌖ 주변"}</button>
        <button type="button" aria-expanded={toolPanel === "route"} aria-controls="map-panel-route" className={toolPanel === "route" ? "active" : ""} onClick={(event) => togglePanel("route", event.currentTarget)} disabled={!interactive || provider === "error"}>{english ? "⇄ Route points" : "⇄ 출발·도착"}</button>
        <button type="button" aria-expanded={toolPanel === "layers"} aria-controls="map-panel-layers" className={toolPanel === "layers" ? "active" : ""} onClick={(event) => togglePanel("layers", event.currentTarget)} disabled={!interactive || provider !== "kakao"}>{english ? "▱ Map display" : "▱ 지도 표시"}</button>
        <button type="button" aria-pressed={roadviewSelectMode || roadviewOpen} aria-controls={roadviewOpen ? "map-roadview-panel" : roadviewSelectMode ? "map-roadview-choice" : undefined} className={roadviewSelectMode ? "active" : ""} onClick={(event) => onRoadviewSelection(event.currentTarget)} onMouseEnter={() => onRoadviewPreviewChange(true)} onMouseLeave={() => onRoadviewPreviewChange(false)} onFocus={() => onRoadviewPreviewChange(true)} onBlur={() => onRoadviewPreviewChange(false)} disabled={!interactive || provider !== "kakao"}>◉ {english ? "Roadview" : "로드뷰"}</button>
        <button type="button" onClick={onCurrentLocation} disabled={!interactive || provider === "error"}>{english ? "◎ My location" : "◎ 내 위치"}</button>
        <button type="button" aria-expanded={toolPanel === "export"} aria-controls="map-panel-export" className={toolPanel === "export" ? "active" : ""} onClick={(event) => togglePanel("export", event.currentTarget)} disabled={!interactive}>{locale === "en" ? "⇩ Image" : "⇩ 이미지"}</button>
        <button type="button" onClick={onShare} aria-disabled={actionPending} disabled={!interactive}>{locale === "en" ? "↗ Page link" : "↗ 페이지 링크"}</button>
      </div>
      <button type="button" className="map-expand-button" aria-pressed={expanded} aria-controls="route-map-canvas" onClick={(event) => onToggleExpanded(event.currentTarget)} disabled={!interactive}>{expanded ? (english ? "× Close expanded map" : "× 닫기") : (english ? "⛶ Expand map" : "⛶ 전체보기")}</button>
    </nav>
  </>;
}
