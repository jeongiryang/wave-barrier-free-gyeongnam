"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useSitePreferences } from "../../components/SitePreferences";
import type { MapPickMode, MapProvider, MapToolPanel, RoutePoint } from "./types";

interface RoadviewControllerOptions {
  provider: MapProvider;
  setProviderDetail: Dispatch<SetStateAction<string>>;
  setPickMode: Dispatch<SetStateAction<MapPickMode>>;
  setToolPanel: Dispatch<SetStateAction<MapToolPanel>>;
}

export function useRoadviewController({ provider, setPickMode, setToolPanel }: RoadviewControllerOptions) {
  const { locale } = useSitePreferences();
  const roadviewRef = useRef<HTMLDivElement>(null);
  const roadviewSelectModeRef = useRef(false);
  const cancelRequest = useRef<(() => void) | null>(null);
  const [request, setRequest] = useState<{ point: RoutePoint } | null>(null);
  const [status, setStatus] = useState<"loading" | "empty" | "error" | "ready">("loading");
  const [roadviewSelectMode, setRoadviewSelectMode] = useState(false);
  const [roadviewPreviewOpen, setRoadviewPreviewOpen] = useState(false);
  const closeRoadview = useCallback(() => { cancelRequest.current?.(); setRequest(null); }, []);

  useEffect(() => { roadviewSelectModeRef.current = roadviewSelectMode; }, [roadviewSelectMode]);

  // Stable callback: locale/status changes must not recreate the parent map.
  const openRoadviewAt = useCallback((point: RoutePoint) => {
    cancelRequest.current?.();
    roadviewSelectModeRef.current = false;
    setRoadviewSelectMode(false);
    setRoadviewPreviewOpen(false);
    setToolPanel(null);
    setStatus("loading");
    setRequest({ point: { ...point } });
  }, [setToolPanel]);

  // Effects run after the container is committed, unlike a frame scheduled in an event.
  useEffect(() => {
    if (!request) return;
    const node = roadviewRef.current;
    const sdk = window.kakao?.maps;
    let active = true;
    let removeListener: (() => void) | undefined;
    const cancel = () => {
      active = false;
      window.clearTimeout(deadline);
      try { removeListener?.(); } catch { /* Stale callbacks are also guarded by active. */ }
    };
    const finish = (next: "empty" | "error" | "ready") => {
      if (!active) return;
      cancel();
      setStatus(next);
    };
    const deadline = window.setTimeout(() => finish("error"), 10_000);
    cancelRequest.current = cancel;
    try {
      const { lat, lng } = request.point;
      if (provider !== "kakao" || !node || !sdk?.event || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw Error("Roadview unavailable");
      const position = new sdk.LatLng(lat, lng);
      const roadview = new sdk.Roadview(node);
      let applied = false;
      let sawInit = false;
      const initialized = () => { sawInit = true; if (applied) finish("ready"); };
      sdk.event.addListener(roadview, "init", initialized);
      removeListener = () => sdk.event?.removeListener?.(roadview, "init", initialized);
      let received = false;
      new sdk.RoadviewClient().getNearestPanoId(position, 1000, (panoId) => {
        if (!active || received) return;
        received = true;
        if (panoId === null) { finish("empty"); return; }
        try {
          if (!Number.isSafeInteger(panoId) || panoId <= 0) throw Error("Invalid panorama");
          roadview.setPanoId(panoId, position);
          roadview.relayout();
          applied = true;
          if (sawInit) finish("ready");
        } catch { finish("error"); }
      });
    } catch { finish("error"); }
    return () => { cancel(); node?.replaceChildren(); };
  }, [request, provider]);

  function beginRoadviewSelection() {
    if (provider !== "kakao") return;
    closeRoadview();
    setRoadviewPreviewOpen(false);
    setPickMode(null);
    setToolPanel(null);
    setRoadviewSelectMode(current => !current);
  }

  const english = locale === "en";
  const roadviewMessage = status === "ready" ? "" : status === "loading"
    ? (english ? "Loading a nearby Roadview." : "가까운 로드뷰를 불러오고 있습니다.")
    : status === "empty" ? (english ? "No Roadview is available within 1 km. Choose another place or return to your itinerary." : "반경 1km 안에 제공되는 로드뷰가 없습니다. 다른 장소를 선택하거나 일정으로 돌아가세요.")
    : (english ? "Roadview could not be loaded. Try again or return to your itinerary." : "로드뷰를 불러오지 못했습니다. 다시 시도하거나 일정으로 돌아가세요.");

  return {
    roadviewRef, roadviewSelectModeRef, roadviewOpen: request !== null, roadviewMessage,
    roadviewLoading: status === "loading", roadviewSelectMode, roadviewPreviewOpen,
    setRoadviewSelectMode, setRoadviewPreviewOpen, openRoadviewAt, beginRoadviewSelection,
    retryRoadview: () => { if (request && status !== "loading") openRoadviewAt(request.point); },
    cancelRoadviewSelection: () => { roadviewSelectModeRef.current = false; setRoadviewSelectMode(false); },
    closeRoadview,
  };
}
