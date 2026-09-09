"use client";

import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import type { MapToolPanel } from "./types";

const panelIds: Record<Exclude<MapToolPanel, null>, string> = {
  nearby: "map-panel-nearby",
  route: "map-panel-route",
  place: "map-panel-place",
  layers: "map-panel-layers",
  export: "map-panel-export",
};

function restoreToolFocus(trigger: HTMLButtonElement | null) {
  if (!trigger?.isConnected) return;
  const visible = trigger.getClientRects().length > 0 && !trigger.disabled;
  const target = visible ? trigger : trigger.closest(".map-command-bar")?.querySelector<HTMLButtonElement>(".map-tools-toggle");
  target?.focus();
}

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
    if (toolPanel) {
      document.getElementById(panelIds[toolPanel])?.querySelector<HTMLButtonElement>("header > button")?.focus();
    } else if (previous && panelTriggerRef.current?.panel === previous) {
      const trigger = panelTriggerRef.current.node;
      panelTriggerRef.current = null;
      if (document.activeElement === document.body || !document.activeElement?.isConnected) restoreToolFocus(trigger);
    }
  }, [toolPanel]);

  useEffect(() => {
    const wasExpanded = wasExpandedRef.current;
    wasExpandedRef.current = expanded;
    if (!expanded && wasExpanded) window.requestAnimationFrame(() => expandTriggerRef.current?.focus());
  }, [expanded]);

  useEffect(() => {
    const wasOpen = previousRoadviewOpenRef.current;
    previousRoadviewOpenRef.current = roadviewOpen;
    if (roadviewOpen && !wasOpen) {
      document.getElementById("map-roadview-panel")?.querySelector<HTMLButtonElement>("header > button")?.focus();
    }
  }, [roadviewOpen]);

  useEffect(() => {
    if (roadviewSelectMode) document.getElementById("map-roadview-choice")?.querySelector<HTMLButtonElement>("header button")?.focus();
  }, [roadviewSelectMode]);

  const closeOnEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    if (toolPanel) {
      event.preventDefault();
      setToolPanel(null);
    }
    if (roadviewOpen) {
      event.preventDefault();
      closeRoadview();
      restoreToolFocus(roadviewTriggerRef.current);
    } else if (roadviewSelectMode) {
      event.preventDefault();
      cancelRoadviewSelection();
      restoreToolFocus(roadviewTriggerRef.current);
    }
  });
  // Keep the listener installed while the map shell cancels point selection.
  // Re-registering on that render can remove it midway through the same key event.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => closeOnEscape(event);
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

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
    restoreToolFocus(roadviewTriggerRef.current);
  }, [closeRoadview]);

  const cancelRoadviewAndRestoreFocus = useCallback(() => {
    cancelRoadviewSelection();
    restoreToolFocus(roadviewTriggerRef.current);
  }, [cancelRoadviewSelection]);

  return { changeToolPanel, beginRoadviewFromTrigger, toggleExpandedFromTrigger, closeRoadviewAndRestoreFocus, cancelRoadviewAndRestoreFocus };
}
