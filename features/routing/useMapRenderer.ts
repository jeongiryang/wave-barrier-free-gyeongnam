import { useEffect } from "react";
import { renderKakaoMap } from "./kakao-map-renderer";
import { renderLeafletMap } from "./leaflet-map-renderer";
import type { MapRendererContext } from "./map-renderer-context";

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
    containerRef,
    mapRef,
    kakaoMapRef,
    drawingManagerRef,
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

  useEffect(() => {
    let cancelled = false;
    const context: MapRendererContext = {
      containerRef,
      mapRef,
      kakaoMapRef,
      drawingManagerRef,
      origin,
      places,
      route,
      crowdVisual,
      crowdPlace,
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
    };
    const isCancelled = () => cancelled;

    async function render() {
      setProvider("loading");
      setProviderDetail("카카오 지도를 연결하고 있습니다.");
      const key = await mapJavascriptKey();
      if (key) {
        try {
          const rendered = await renderKakaoMap(key, context, isCancelled);
          if (rendered || cancelled) return;
        } catch (error) {
          setProviderDetail(error instanceof Error && error.message.includes("domain")
            ? "Kakao JavaScript SDK 도메인 등록을 확인해 주세요. 대체 지도를 표시합니다."
            : "Kakao 지도 연결이 지연되어 대체 지도를 표시합니다.");
        }
      } else {
        setProviderDetail("Kakao JavaScript 키가 없어 대체 지도를 표시합니다.");
      }
      await renderLeafletMap(context, isCancelled);
    }

    void render();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      kakaoMapRef.current = null;
      drawingManagerRef.current = null;
      clearCategoryMarkers();
    };
  }, [
    origin,
    places,
    route,
    retryNonce,
    crowdVisual,
    crowdPlace,
    clearCategoryMarkers,
    choosePlace,
    containerRef,
    drawingManagerRef,
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
}
