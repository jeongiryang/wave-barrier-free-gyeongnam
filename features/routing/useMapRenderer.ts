import { useEffect, useEffectEvent, useRef } from "react";
import { renderKakaoMap } from "./kakao-map-renderer";
import { renderLeafletMap } from "./leaflet-map-renderer";
import type { MapContentController, MapRendererContext } from "./map-renderer-context";

interface UseMapRendererOptions extends MapRendererContext {
  retryNonce: number;
}

async function mapJavascriptKey() {
  try {
    const response = await fetch("/api/map-config", { headers: { Accept: "application/json" } });
    if (!response.ok) return "";
    return ((await response.json()) as { javascriptKey?: string }).javascriptKey || "";
  } catch {
    return "";
  }
}

export function useMapRenderer(options: UseMapRendererOptions) {
  const {
    retryNonce,
    origin,
    places,
    route,
    crowdVisual,
    crowdPlace,
    facilityMarkers,
    chooseFacilityMarker,
    containerRef,
    mapRef,
    kakaoMapRef,
    drawingManagerRef,
    fitMapRef,
    clearCategoryMarkers,
    choosePlace,
    onDestinationChangeRef,
    onOriginChangeRef,
    openRoadviewAt,
    pickModeRef,
    roadviewSelectModeRef,
    setMeasureSummary,
    setPickMode,
    setProvider,
    setProviderDetail,
    setRoadviewSelectMode,
    setSelectedMapPlace,
  } = options;

  const contentRef = useRef<MapContentController | null>(null);
  const readContent = useEffectEvent(() => ({ origin, places, route, crowdVisual, crowdPlace, facilityMarkers }));
  // Only a different travel scope replaces the map and invalidates its searches.
  const geometryKey = JSON.stringify([origin.lat, origin.lng, places.map(place => [place.id, Number(place.mapX), Number(place.mapY)])]);

  useEffect(() => {
    let cancelled = false;
    const context: MapRendererContext = {
      containerRef,
      mapRef,
      kakaoMapRef,
      drawingManagerRef,
      fitMapRef,
      ...readContent(),
      pickModeRef,
      roadviewSelectModeRef,
      onOriginChangeRef,
      onDestinationChangeRef,
      openRoadviewAt,
      choosePlace,
      clearCategoryMarkers,
      setProvider,
      setProviderDetail,
      setSelectedMapPlace,
      setPickMode,
      setRoadviewSelectMode,
      setMeasureSummary,
      chooseFacilityMarker,
    };
    const isCancelled = () => cancelled;

    async function render() {
      setProvider("loading");
      setProviderDetail("카카오 지도를 연결하고 있습니다.");
      const key = await mapJavascriptKey();
      if (cancelled) return;
      if (key) {
        try {
          const rendered = await renderKakaoMap(key, context, isCancelled);
          if (rendered) {
            if (cancelled) { rendered.dispose(); return; }
            contentRef.current = rendered;
            rendered.update(readContent());
            return;
          }
          if (cancelled) return;
        } catch (error) {
          if (cancelled) return;
          setProviderDetail(error instanceof Error && error.message.includes("domain")
            ? "기본 지도를 불러오지 못해 대체 지도를 표시합니다."
            : "기본 지도 연결이 지연되어 대체 지도를 표시합니다.");
        }
      } else {
        setProviderDetail("기본 지도를 불러오지 못해 대체 지도를 표시합니다.");
      }
      const rendered = await renderLeafletMap(context, isCancelled);
      if (rendered) {
        if (cancelled) { rendered.dispose(); return; }
        contentRef.current = rendered;
        rendered.update(readContent());
      }
    }

    void render().catch(() => {
      if (cancelled) return;
      setProvider("error");
      setProviderDetail("지도를 불러오지 못했습니다.");
    });
    return () => {
      cancelled = true;
      contentRef.current?.dispose();
      contentRef.current = null;
      fitMapRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      kakaoMapRef.current = null;
      drawingManagerRef.current = null;
      clearCategoryMarkers();
    };
  }, [
    geometryKey,
    retryNonce,
    clearCategoryMarkers,
    choosePlace,
    chooseFacilityMarker,
    containerRef,
    drawingManagerRef,
    fitMapRef,
    kakaoMapRef,
    mapRef,
    onDestinationChangeRef,
    onOriginChangeRef,
    openRoadviewAt,
    pickModeRef,
    roadviewSelectModeRef,
    setMeasureSummary,
    setPickMode,
    setProvider,
    setProviderDetail,
    setRoadviewSelectMode,
    setSelectedMapPlace,
  ]);

  useEffect(() => {
    try { contentRef.current?.update({ origin, places, route, crowdVisual, crowdPlace, facilityMarkers }); }
    catch {
      setProvider("error");
      setProviderDetail("지도를 불러오지 못했습니다.");
    }
  }, [origin, places, route, crowdVisual, crowdPlace, facilityMarkers, setProvider, setProviderDetail]);
}
