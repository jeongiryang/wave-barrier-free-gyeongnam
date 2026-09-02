"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MapToolPanel } from "./types";

const panelIds: Record<Exclude<MapToolPanel, null>, string> = {
  nearby: "map-panel-nearby",
  route: "map-panel-route",
  place: "map-panel-place",
  layers: "map-panel-layers",
  export: "map-panel-export",
};

export function useMapAccessibility({
  toolPanel,
  expanded,
  roadviewOpen,
  roadviewSelectMode,
  setToolPanel,
  beginRoadviewSelection,
  cancelRoadviewSelection,
  closeRoadview,
  toggleExpanded,
}: {
  toolPanel: MapToolPanel;
  expanded: boolean;
  roadviewOpen: boolean;
  roadviewSelectMode: boolean;
  setToolPanel: (panel: MapToolPanel) => void;
  beginRoadviewSelection: () => void;
  cancelRoadviewSelection: () => void;
  closeRoadview: () => void;
  toggleExpanded: () => Promise<void>;
}) {
  const panelTriggerRef = useRef<{ panel: Exclude<MapToolPanel, null>; node: HTMLButtonElement } | null>(null);
  const previousPanelRef = useRef<MapToolPanel>(null);
  const roadviewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const previousRoadviewOpenRef = useRef(false);
  const expandTriggerRef = useRef<HTMLButtonElement | null>(null);
  const wasExpandedRef = useRef(false);

  useEffect(() => {
    const previous = previousPanelRef.current;
    previousPanelRef.current = toolPanel;
    let frame = 0;
    if (toolPanel) {
      frame = window.requestAnimationFrame(() => {
        document.getElementById(panelIds[toolPanel])?.querySelector<HTMLButtonElement>("header > button")?.focus();
      });
    } else if (previous && panelTriggerRef.current?.panel === previous) {
      const trigger = panelTriggerRef.current.node;
      panelTriggerRef.current = null;
      frame = window.requestAnimationFrame(() => trigger.focus());
    }
    return () => window.cancelAnimationFrame(frame);
  }, [toolPanel]);

  useEffect(() => {
    const wasExpanded = wasExpandedRef.current;
    wasExpandedRef.current = expanded;
    if (!expanded && wasExpanded) window.requestAnimationFrame(() => expandTriggerRef.current?.focus());
  }, [expanded]);

  useEffect(() => {
    const wasOpen = previousRoadviewOpenRef.current;
    previousRoadviewOpenRef.current = roadviewOpen;
    let frame = 0;
    if (roadviewOpen && !wasOpen) {
      frame = window.requestAnimationFrame(() => {
        document.getElementById("map-roadview-panel")?.querySelector<HTMLButtonElement>("header > button")?.focus();
      });
    }
    return () => window.cancelAnimationFrame(frame);
  }, [roadviewOpen]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (toolPanel) {
        event.preventDefault();
        setToolPanel(null);
      }
      if (roadviewOpen) {
        event.preventDefault();
        closeRoadview();
        window.requestAnimationFrame(() => roadviewTriggerRef.current?.focus());
      } else if (roadviewSelectMode) {
        event.preventDefault();
        cancelRoadviewSelection();
        window.requestAnimationFrame(() => roadviewTriggerRef.current?.focus());
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [cancelRoadviewSelection, closeRoadview, roadviewOpen, roadviewSelectMode, setToolPanel, toolPanel]);

  const changeToolPanel = useCallback((panel: MapToolPanel, trigger: HTMLButtonElement) => {
    if (panel) panelTriggerRef.current = { panel, node: trigger };
    setToolPanel(panel);
  }, [setToolPanel]);

  const beginRoadviewFromTrigger = useCallback((trigger: HTMLButtonElement) => {
    roadviewTriggerRef.current = trigger;
    beginRoadviewSelection();
  }, [beginRoadviewSelection]);

  const toggleExpandedFromTrigger = useCallback((trigger: HTMLButtonElement) => {
    expandTriggerRef.current = trigger;
    void toggleExpanded();
  }, [toggleExpanded]);

  const closeRoadviewAndRestoreFocus = useCallback(() => {
    closeRoadview();
    window.requestAnimationFrame(() => roadviewTriggerRef.current?.focus());
  }, [closeRoadview]);

  return { changeToolPanel, beginRoadviewFromTrigger, toggleExpandedFromTrigger, closeRoadviewAndRestoreFocus };
}
