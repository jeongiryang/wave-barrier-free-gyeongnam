"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { MapPickMode, MapProvider, MapToolPanel, RoutePoint } from "./types";

interface RoadviewControllerOptions {
  provider: MapProvider;
  setProviderDetail: Dispatch<SetStateAction<string>>;
  setPickMode: Dispatch<SetStateAction<MapPickMode>>;
  setToolPanel: Dispatch<SetStateAction<MapToolPanel>>;
}

export function useRoadviewController({
  provider,
  setProviderDetail,
  setPickMode,
  setToolPanel,
}: RoadviewControllerOptions) {
  const roadviewRef = useRef<HTMLDivElement>(null);
  const roadviewSelectModeRef = useRef(false);
  const [roadviewOpen, setRoadviewOpen] = useState(false);
  const [roadviewMessage, setRoadviewMessage] = useState("");
  const [roadviewSelectMode, setRoadviewSelectMode] = useState(false);
  const [roadviewPreviewOpen, setRoadviewPreviewOpen] = useState(false);

  useEffect(() => {
    roadviewSelectModeRef.current = roadviewSelectMode;
  }, [roadviewSelectMode]);

  const openRoadviewAt = useCallback((point: RoutePoint) => {
    const sdk = window.kakao?.maps;
    if (!sdk) return;
    setRoadviewSelectMode(false);
    setRoadviewPreviewOpen(false);
    setToolPanel(null);
    setRoadviewOpen(true);
    setRoadviewMessage("가까운 로드뷰를 찾고 있습니다.");
    window.requestAnimationFrame(() => {
      if (!roadviewRef.current) return;
      const position = new sdk.LatLng(point.lat, point.lng);
      const roadview = new sdk.Roadview(roadviewRef.current);
      new sdk.RoadviewClient().getNearestPanoId(position, 1000, (panoId) => {
        if (!panoId) {
          setRoadviewMessage("반경 1km 안에 제공되는 로드뷰가 없습니다.");
          return;
        }
        roadview.setPanoId(panoId, position);
        roadview.relayout();
        setRoadviewMessage("");
      });
    });
  }, [setToolPanel]);

  function beginRoadviewSelection() {
    if (provider !== "kakao") return;
    setRoadviewPreviewOpen(false);
    setPickMode(null);
    setToolPanel(null);
    setRoadviewSelectMode((current) => {
      const next = !current;
      setProviderDetail(next
        ? "로드뷰로 확인할 위치를 지도에서 클릭하세요."
        : "로드뷰 위치 선택을 취소했습니다.");
      return next;
    });
  }

  return {
    roadviewRef,
    roadviewSelectModeRef,
    roadviewOpen,
    roadviewMessage,
    roadviewSelectMode,
    roadviewPreviewOpen,
    setRoadviewSelectMode,
    setRoadviewPreviewOpen,
    openRoadviewAt,
    beginRoadviewSelection,
    cancelRoadviewSelection: () => {
      setRoadviewSelectMode(false);
      setProviderDetail("로드뷰 위치 선택을 취소했습니다.");
    },
    closeRoadview: () => setRoadviewOpen(false),
  };
}
