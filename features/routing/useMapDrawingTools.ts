"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { KakaoDrawingManager } from "./kakao-sdk";
import type { MutableRef } from "./map-renderer-context";
import type { MeasurementMode } from "./types";

interface MapDrawingToolsOptions {
  drawingManagerRef: MutableRef<KakaoDrawingManager | null>;
  setProviderDetail: Dispatch<SetStateAction<string>>;
}

export function useMapDrawingTools({ drawingManagerRef, setProviderDetail }: MapDrawingToolsOptions) {
  const [measureMode, setMeasureMode] = useState<MeasurementMode | null>(null);
  const [measureSummary, setMeasureSummary] = useState("");

  function selectMeasure(mode: MeasurementMode) {
    const sdk = window.kakao?.maps;
    const manager = drawingManagerRef.current;
    if (!manager || !sdk?.drawing) return;
    manager.cancel();
    manager.select(sdk.drawing.OverlayType[mode]);
    setMeasureMode(mode);
    setProviderDetail(mode === "POLYLINE"
      ? "지도를 클릭해 거리를 그리세요."
      : mode === "CIRCLE"
        ? "지도를 드래그해 반경을 그리세요."
        : "지도를 클릭해 면적을 그리세요.");
  }

  function clearMeasurements() {
    const manager = drawingManagerRef.current;
    if (!manager) return;
    manager.cancel();
    const overlays = manager.getOverlays();
    Object.values(overlays).forEach((items) => items.forEach((item) => manager.remove(item)));
    setMeasureMode(null);
    setMeasureSummary("");
    setProviderDetail("지도 위 측정 도형을 지웠습니다.");
  }

  return { measureMode, measureSummary, setMeasureSummary, selectMeasure, clearMeasurements };
}
