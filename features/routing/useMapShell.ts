"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { KakaoMap } from "./kakao-sdk";
import type { MapPickMode } from "./types";
import { mapFitPadding } from "./map-utils";

type MapShellOptions = {
  fitMapRef: RefObject<(() => void) | null>;
  kakaoMapRef: RefObject<KakaoMap | null>;
  mapRef: RefObject<LeafletMap | null>;
  pickModeRef: RefObject<MapPickMode>;
  setPickMode: (mode: MapPickMode) => void;
  layoutKey: string;
};

export function useMapShell({
  fitMapRef,
  kakaoMapRef,
  mapRef,
  pickModeRef,
  setPickMode,
  layoutKey,
}: MapShellOptions) {
  const shellRef = useRef<HTMLDivElement>(null);
  const geometryRef = useRef("");
  const fittedMapRef = useRef<(() => void) | null>(null);
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
      // Close the innermost tool first. The accessibility controller restores
      // its trigger; the next Escape may then leave the expanded map.
      if (event.defaultPrevented) return;
      if (pickModeRef.current) setPickMode(null);
      if (shellRef.current?.querySelector(".map-tool-panel, .map-roadview-panel, .map-roadview-choice")) return;
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
    const shell = shellRef.current;
    const canvas = shell?.querySelector<HTMLElement>(".route-map-canvas");
    const drawerHeading = shell?.querySelector<HTMLElement>(".map-side-drawer > header");
    let timeoutId: number;
    let frameId: number;
    const updateLayout = () => {
      if (shell) {
        const top = shell.getBoundingClientRect().top;
        const bottom = Math.max(0, ...[...shell.querySelectorAll<HTMLElement>(".map-command-bar, .map-provider-badge")].map(node => node.getBoundingClientRect().bottom - top));
        shell.style.setProperty("--map-controls-bottom", `${Math.ceil(bottom)}px`);
        if (drawerHeading) shell.style.setProperty("--map-drawer-heading", `${Math.ceil(drawerHeading.getBoundingClientRect().height)}px`);
      }
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        kakaoMapRef.current?.relayout();
        mapRef.current?.invalidateSize();
        if (!canvas?.clientWidth || !canvas.clientHeight) return;
        const geometry = [canvas.clientWidth, canvas.clientHeight, ...mapFitPadding(canvas)].join(":");
        // No coordinate/current-bounds comparison: user pan and page scroll
        // must not refit the map. Only the actual available geometry changes.
        // A new day can replace the SDK map while reusing the same final UI
        // dimensions. That new map still needs the settled toolbar padding.
        if (geometry !== geometryRef.current || fittedMapRef.current !== fitMapRef.current) {
          geometryRef.current = geometry;
          fittedMapRef.current = fitMapRef.current;
          fitMapRef.current?.();
        }
      }, 260);
    };
    // Write layout on the next frame, outside ResizeObserver delivery. Writing
    // from its callback can trigger an observer loop in mobile WebKit.
    const schedule = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateLayout);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    if (canvas) observer?.observe(canvas);
    if (drawerHeading) observer?.observe(drawerHeading);
    shell?.querySelectorAll<HTMLElement>(".map-command-bar, .map-provider-badge").forEach((node) => observer?.observe(node));
    schedule();
    return () => { observer?.disconnect(); window.cancelAnimationFrame(frameId); window.clearTimeout(timeoutId); };
  }, [expanded, fitMapRef, kakaoMapRef, layoutKey, mapRef]);

  return { shellRef, expanded, toggleExpanded };
}
