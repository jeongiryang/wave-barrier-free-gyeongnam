"use client";

import MapCommandBar from "../features/routing/components/MapCommandBar";
import MapExportPanel from "../features/routing/components/MapExportPanel";
import MapLayerPanel from "../features/routing/components/MapLayerPanel";
import MapPlacePanel from "../features/routing/components/MapPlacePanel";
import { MapCanvasStatusOverlays, RoadviewSelectionOverlays } from "../features/routing/components/MapStatusOverlays";
import NearbyPlacesPanel from "../features/routing/components/NearbyPlacesPanel";
import RoutePointPanel from "../features/routing/components/RoutePointPanel";
import type { RouteMapProps } from "../features/routing/types";
import { useMapAccessibility } from "../features/routing/useMapAccessibility";
import { useRouteMapController } from "../features/routing/useRouteMapController";

export default function RouteMap(props: RouteMapProps) {
  const { origin, places, crowd } = props;
  const {
    containerRef,
    roadviewRef,
    shellRef,
    provider,
    providerDetail,
    baseMap,
    activeLayers,
    toolPanel,
    expanded,
    pickMode,
    selectedMapPlace,
    activeCategory,
    categoryPlaces,
    categoryMessage,
    roadviewOpen,
    roadviewMessage,
    roadviewSelectMode,
    roadviewPreviewOpen,
    crowdVisual,
    crowdPlace,
    retryProvider,
    changeBaseMap,
    setToolPanel,
    beginRoadviewSelection,
    setRoadviewPreviewOpen,
    moveToCurrentLocation,
    shareRoute,
    toggleExpanded,
    cancelRoadviewSelection,
    searchNearby,
    chooseKakaoPlace,
    closeRoutePanel,
    setMapPointMode,
    setPlaceAsOrigin,
    setPlaceAsDestination,
    toggleLayer,
    saveRoute,
    exportRoute,
    closeRoadview,
  } = useRouteMapController(props);
  const drawerOpen = toolPanel !== null;
  const mapA11y = useMapAccessibility({
    toolPanel, expanded, roadviewOpen, roadviewSelectMode, setToolPanel,
    beginRoadviewSelection, cancelRoadviewSelection, closeRoadview, toggleExpanded,
  });

  return <div ref={shellRef} className={`route-map-shell${drawerOpen ? " drawer-open" : ""}${expanded ? " expanded" : ""}`}>
    <MapCommandBar
      provider={provider}
      providerDetail={providerDetail}
      baseMap={baseMap}
      toolPanel={toolPanel}
      roadviewSelectMode={roadviewSelectMode}
      roadviewOpen={roadviewOpen}
      expanded={expanded}
      onRetry={retryProvider}
      onBaseMapChange={changeBaseMap}
      onToolPanelChange={mapA11y.changeToolPanel}
      onRoadviewSelection={mapA11y.beginRoadviewFromTrigger}
      onRoadviewPreviewChange={setRoadviewPreviewOpen}
      onCurrentLocation={moveToCurrentLocation}
      onShare={() => void shareRoute()}
      onToggleExpanded={mapA11y.toggleExpandedFromTrigger}
    />

    <RoadviewSelectionOverlays
      provider={provider}
      roadviewSelectMode={roadviewSelectMode}
      roadviewPreviewOpen={roadviewPreviewOpen}
      roadviewOpen={roadviewOpen}
      selectedMapPlace={selectedMapPlace}
      places={places}
      onCancelRoadviewSelection={cancelRoadviewSelection}
    />

    {toolPanel === "nearby" && <NearbyPlacesPanel
      activeCategory={activeCategory}
      categoryMessage={categoryMessage}
      categoryPlaces={categoryPlaces}
      onClose={() => setToolPanel(null)}
      onSearch={searchNearby}
      onChoosePlace={chooseKakaoPlace}
    />}

    {toolPanel === "route" && <RoutePointPanel
      origin={origin}
      pickMode={pickMode}
      onClose={closeRoutePanel}
      onCurrentLocation={moveToCurrentLocation}
      onSelectMode={setMapPointMode}
    />}

    {toolPanel === "place" && selectedMapPlace && <MapPlacePanel
      place={selectedMapPlace}
      onClose={() => setToolPanel(null)}
      onSetOrigin={setPlaceAsOrigin}
      onSetDestination={setPlaceAsDestination}
    />}

    {toolPanel === "layers" && <MapLayerPanel
      activeLayers={activeLayers}
      onClose={() => setToolPanel(null)}
      onToggleLayer={toggleLayer}
      onSave={saveRoute}
      onShare={() => void shareRoute()}
    />}

    {toolPanel === "export" && <MapExportPanel
      onClose={() => setToolPanel(null)}
      onExport={exportRoute}
      onShare={() => void shareRoute()}
    />}

    <div id="route-map-canvas" className="route-map-canvas" ref={containerRef} role="region" aria-label="출발지와 추천 여행지를 표시한 대화형 경로 지도" />
    <MapCanvasStatusOverlays
      provider={provider}
      roadviewOpen={roadviewOpen}
      roadviewMessage={roadviewMessage}
      roadviewRef={roadviewRef}
      crowd={crowd}
      crowdPlace={crowdPlace}
      crowdVisual={crowdVisual}
      onCloseRoadview={mapA11y.closeRoadviewAndRestoreFocus}
    />
  </div>;
}
