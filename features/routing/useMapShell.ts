"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { KakaoMap } from "./kakao-sdk";
import type { MapPickMode } from "./types";

type MapShellOptions = {
  kakaoMapRef: RefObject<KakaoMap | null>;
  mapRef: RefObject<LeafletMap | null>;
  pickModeRef: RefObject<MapPickMode>;
  roadviewSelectModeRef: RefObject<boolean>;
  setPickMode: (mode: MapPickMode) => void;
  setRoadviewSelectMode: (active: boolean) => void;
  layoutKey: string;
};

export function useMapShell({
  kakaoMapRef,
  mapRef,
  pickModeRef,
  roadviewSelectModeRef,
  setPickMode,
  setRoadviewSelectMode,
  layoutKey,
}: MapShellOptions) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    if (expanded && !document.fullscreenElement) {
      setExpanded(false);
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch {
      setExpanded((value) => !value);
    }
  }, [expanded]);

  useEffect(() => {
    const onFullscreen = () => setExpanded(document.fullscreenElement === shellRef.current);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (pickModeRef.current) setPickMode(null);
      if (roadviewSelectModeRef.current) setRoadviewSelectMode(false);
      setExpanded(false);
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pickModeRef, roadviewSelectModeRef, setPickMode, setRoadviewSelectMode]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      kakaoMapRef.current?.relayout();
      mapRef.current?.invalidateSize();
    }, 260);
    return () => window.clearTimeout(timeoutId);
  }, [kakaoMapRef, layoutKey, mapRef]);

  return { shellRef, expanded, toggleExpanded };
}
