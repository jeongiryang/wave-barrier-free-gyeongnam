"use client";

import { useState } from "react";
import { overlayLayers } from "./constants";
import type { KakaoMap } from "./kakao-sdk";
import type { MutableRef } from "./map-renderer-context";

export function useMapLayers(kakaoMapRef: MutableRef<KakaoMap | null>) {
  const [baseMap, setBaseMap] = useState<"roadmap" | "skyview">("roadmap");
  const [activeLayers, setActiveLayers] = useState<string[]>([]);

  function changeBaseMap(next: "roadmap" | "skyview") {
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    if (!map || !sdk) return;
    map.setMapTypeId(next === "skyview" ? sdk.MapTypeId.HYBRID : sdk.MapTypeId.ROADMAP);
    setBaseMap(next);
  }

  function toggleLayer(id: (typeof overlayLayers)[number]["id"]) {
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    if (!map || !sdk) return;
    setActiveLayers((current) => {
      if (current.includes(id)) {
        map.removeOverlayMapTypeId(sdk.MapTypeId[id]);
        return current.filter((item) => item !== id);
      }
      map.addOverlayMapTypeId(sdk.MapTypeId[id]);
      return [...current, id];
    });
  }

  return { baseMap, activeLayers, changeBaseMap, toggleLayer };
}
