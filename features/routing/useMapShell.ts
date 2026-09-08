"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { KakaoMap } from "./kakao-sdk";
import type { MapPickMode } from "./types";

type MapShellOptions = {
  kakaoMapRef: RefObject<KakaoMap | null>;
  mapRef: RefObject<LeafletMap | null>;
  pickModeRef: RefObject<MapPickMode>;
  setPickMode: (mode: MapPickMode) => void;
  layoutKey: string;
};

export function useMapShell({
  kakaoMapRef,
  mapRef,
  pickModeRef,
  setPickMode,
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
      // Roadview cancellation belongs to useMapAccessibility so focus is restored too.
      if (document.fullscreenElement === shellRef.current) {
        // Keep rendered state tied to fullscreenchange, including browser-key events.
        void document.exitFullscreen().catch(() => undefined);
      } else setExpanded(false);
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pickModeRef, setPickMode]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      kakaoMapRef.current?.relayout();
      mapRef.current?.invalidateSize();
    }, 260);
    return () => window.clearTimeout(timeoutId);
  }, [kakaoMapRef, layoutKey, mapRef]);

  return { shellRef, expanded, toggleExpanded };
}
