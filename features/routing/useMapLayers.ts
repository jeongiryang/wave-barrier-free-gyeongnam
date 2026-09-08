"use client";

import { useCallback, useRef, useState } from "react";
import { overlayLayers } from "./constants";
import type { KakaoMap } from "./kakao-sdk";
import type { MutableRef } from "./map-renderer-context";

type Selection = { baseMap: "roadmap" | "skyview"; activeLayers: string[] };
const initialSelection = (): Selection => ({ baseMap: "roadmap", activeLayers: [] });

export function useMapLayers(kakaoMapRef: MutableRef<KakaoMap | null>) {
  const confirmed = useRef<Selection>(initialSelection());
  const requested = useRef<Selection>(initialSelection());
  const restoredMap = useRef<KakaoMap | null>(null);
  const [selection, setSelection] = useState<Selection>(initialSelection());
  const [layerError, setLayerError] = useState(false);
  const [layerRecovery, setLayerRecovery] = useState(false);
  const commit = useCallback((next: Selection) => {
    confirmed.current = next;
    setSelection(next);
  }, []);

  function confirmChange(applied: Selection) {
    commit(applied);
    const desired = requested.current;
    const pending = desired.baseMap !== applied.baseMap || desired.activeLayers.length !== applied.activeLayers.length
      || desired.activeLayers.some((id) => !applied.activeLayers.includes(id));
    setLayerError(pending);
  }

  const restoreMapLayers = useCallback(() => {
    const map = kakaoMapRef.current, sdk = window.kakao?.maps;
    if (!map || !sdk || restoredMap.current === map) return;
    restoredMap.current = map;
    const desired = requested.current, applied = initialSelection();
    let failed = false;
    try { map.setMapTypeId(desired.baseMap === "skyview" ? sdk.MapTypeId.HYBRID : sdk.MapTypeId.ROADMAP); applied.baseMap = desired.baseMap; }
    catch { failed = true; }
    for (const id of desired.activeLayers) {
      try { map.addOverlayMapTypeId(sdk.MapTypeId[id as keyof typeof sdk.MapTypeId]); applied.activeLayers.push(id); }
      catch { failed = true; }
    }
    commit(applied);
    setLayerError(failed);
    if (failed) setLayerRecovery(true);
  }, [commit, kakaoMapRef]);

  const clearAppliedMapLayers = useCallback(() => {
    restoredMap.current = null;
    commit(initialSelection());
    setLayerError(false);
  }, [commit]);

  function changeBaseMap(next: "roadmap" | "skyview") {
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    if (!map || !sdk) { setLayerError(true); setLayerRecovery(true); return; }
    requested.current = { ...requested.current, baseMap: next };
    try {
      map.setMapTypeId(next === "skyview" ? sdk.MapTypeId.HYBRID : sdk.MapTypeId.ROADMAP);
      confirmChange({ ...confirmed.current, baseMap: next });
    } catch { setLayerError(true); setLayerRecovery(true); }
  }

  function toggleLayer(id: (typeof overlayLayers)[number]["id"]) {
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    if (!map || !sdk) { setLayerError(true); setLayerRecovery(true); return; }
    const current = confirmed.current, removing = current.activeLayers.includes(id);
    requested.current = { ...requested.current, activeLayers: removing ? requested.current.activeLayers.filter((item) => item !== id) : [...new Set([...requested.current.activeLayers, id])] };
    try {
      if (removing) map.removeOverlayMapTypeId(sdk.MapTypeId[id]);
      else map.addOverlayMapTypeId(sdk.MapTypeId[id]);
      confirmChange({ ...current, activeLayers: removing ? current.activeLayers.filter((item) => item !== id) : [...current.activeLayers, id] });
    } catch { setLayerError(true); setLayerRecovery(true); }
  }

  return { ...selection, layerError, layerRecovery, restoreMapLayers, clearAppliedMapLayers, changeBaseMap, toggleLayer };
}
