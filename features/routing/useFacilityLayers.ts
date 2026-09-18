"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearFacilityLayer,
  emptyFacilitySelection,
  facilityDistanceMeters,
  failFacilityLayer,
  hiddenFacilityMarkerCount,
  mergeFacilityMarkers,
  toggleFacilityLayer,
  visibleFacilityMarkers,
  type FacilityLayerMarker,
  type FacilityLayerSelection,
} from "../../lib/facility-layers.js";
import { FACILITY_LAYER_LIMIT, FACILITY_MARKER_CAP, facilityLayers, type FacilityLayer } from "./constants";
import type { KakaoMap, KakaoPlace } from "./kakao-sdk";
import type { MutableRef } from "./map-renderer-context";
import { NEARBY_RADIUS_METRES, parseNearbyPlaces, type NearbySearchArea } from "./nearby-place-data";
import type { FacilityMapMarker } from "./types";

export type FacilityLayerState = "idle" | "loading" | "ready" | "empty" | "error";

/**
 * 장소 검색은 브라우저 SDK가 직접 부른다. 기존 `useNearbyPlaces`와 같은 한도를
 * 쓴다. 서버를 거치지 않으므로 `SERVER_BUDGET_MS`에 대응하는 항목이 없다.
 */
const PLACE_SEARCH_TIMEOUT_MS = 10_000;

const PLACE_SEARCH_SOURCE = "카카오 장소 검색";

interface FacilityLayersOptions {
  kakaoMapRef: MutableRef<KakaoMap | null>;
  /** 지도 공급자. 카카오가 아니면 장소 검색을 할 수 없다. */
  provider: string;
  /** 일정의 장소 구성이 바뀌면 지도 기준점도 바뀐다. */
  scopeKey: string;
}

export function useFacilityLayers({ kakaoMapRef, provider, scopeKey }: FacilityLayersOptions) {
  const [selection, setSelection] = useState<FacilityLayerSelection>(() => emptyFacilitySelection());
  const [layerStates, setLayerStates] = useState<Record<string, FacilityLayerState>>({});
  const [notice, setNotice] = useState("");
  const [selectedFacility, setSelectedFacility] = useState<FacilityMapMarker | null>(null);

  // 레이어마다 독립된 세대 번호를 둔다. 한 레이어를 끄거나 다시 요청해도 다른
  // 레이어의 진행 중 요청은 건드리지 않는다.
  const generations = useRef<Record<string, number>>({});
  const timers = useRef<Record<string, number>>({});
  const selectionRef = useRef(selection);
  useEffect(() => { selectionRef.current = selection; }, [selection]);

  const stopLayer = useCallback((layerId: string) => {
    generations.current[layerId] = (generations.current[layerId] || 0) + 1;
    const timer = timers.current[layerId];
    if (timer !== undefined) window.clearTimeout(timer);
    delete timers.current[layerId];
  }, []);

  const stopAll = useCallback(() => {
    for (const layer of facilityLayers) stopLayer(layer.id);
  }, [stopLayer]);

  useEffect(() => () => stopAll(), [stopAll]);

  const requestLayer = useCallback((layer: FacilityLayer) => {
    stopLayer(layer.id);
    const token = generations.current[layer.id];
    const settle = (next: FacilityLayerState, markers?: FacilityLayerMarker[]) => {
      if (generations.current[layer.id] !== token) return;
      const timer = timers.current[layer.id];
      if (timer !== undefined) window.clearTimeout(timer);
      delete timers.current[layer.id];
      setLayerStates((current) => ({ ...current, [layer.id]: next }));
      setSelection((current) => next === "error"
        ? failFacilityLayer(current, layer.id)
        : mergeFacilityMarkers(current, layer.id, markers || []));
    };

    setLayerStates((current) => ({ ...current, [layer.id]: "loading" }));

    if (layer.source === "official") {
      // 공식 데이터 레이어를 부르는 자리.
      //
      // 후속 명세가 `server/tourism/`에 제공처 모듈과 `handler.ts` 분기를 만든 뒤
      // 여기에서 `optionalPlannerJson("<action>", { contentId })`로 호출하고,
      // 응답의 `items`를 FacilityLayerMarker로 옮기면 된다. 요청에는 공개
      // `contentId`만 싣는다. 사용자 좌표를 보내는 필드를 만들지 않는다.
      //
      // 지금은 검증된 공식 제공처가 하나도 없어 `officialFacilityLayers`가 비어
      // 있다. 이 갈래는 그 배열에 레이어가 등록되기 전까지 실행되지 않는다.
      settle("error");
      return;
    }

    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    if (!map || !sdk?.services || !layer.code) { settle("error"); return; }

    let area: NearbySearchArea | null = null;
    const callback = (value: unknown, status: string) => {
      if (generations.current[layer.id] !== token) return;
      if (status === sdk.services!.Status.ZERO_RESULT) { settle("empty", []); return; }
      if (status !== sdk.services!.Status.OK) { settle("error"); return; }
      const parsed = area ? parseNearbyPlaces(value, area) : null;
      if (!parsed || (!parsed.places.length && parsed.omitted)) { settle("error"); return; }
      const origin = area;
      const markers = parsed.places.map((place: KakaoPlace) => toFacilityMarker(layer, place, origin));
      settle(markers.length ? "ready" : "empty", markers);
    };

    try {
      // 검색 기준은 지도 중심이다. 지도 중심은 사용자가 고른 공개 장소이며
      // 사용자 위치가 아니다. 이 좌표는 서버로 나가지 않는다.
      const location = map.getCenter();
      area = { lat: location.getLat(), lng: location.getLng(), radius: NEARBY_RADIUS_METRES };
      timers.current[layer.id] = window.setTimeout(() => settle("error"), PLACE_SEARCH_TIMEOUT_MS);
      new sdk.services.Places(map).categorySearch(layer.code, callback, {
        location,
        radius: NEARBY_RADIUS_METRES,
        size: 15,
        sort: sdk.services.SortBy.DISTANCE,
      });
    } catch { settle("error"); }
  }, [kakaoMapRef, stopLayer]);

  const toggleFacility = useCallback((layerId: string) => {
    const layer = facilityLayers.find((item) => item.id === layerId);
    if (!layer) return;
    const current = selectionRef.current.active;
    const next = toggleFacilityLayer(current, layerId, FACILITY_LAYER_LIMIT);
    if (next === current) {
      setNotice("편의 표시는 한 번에 4개까지 볼 수 있어요.");
      return;
    }
    setNotice("");
    if (current.includes(layerId)) {
      // 끄는 쪽: 이 레이어의 진행 중 요청만 취소하고 이 레이어의 마커만 지운다.
      stopLayer(layerId);
      setLayerStates((states) => { const copy = { ...states }; delete copy[layerId]; return copy; });
      setSelectedFacility((marker) => marker?.layerId === layerId ? null : marker);
      setSelection((value) => clearFacilityLayer(value, layerId));
      return;
    }
    setSelection((value) => ({ ...value, active: next }));
    requestLayer(layer);
  }, [requestLayer, stopLayer]);

  const retryFacilityLayer = useCallback((layerId: string) => {
    const layer = facilityLayers.find((item) => item.id === layerId);
    if (layer && selectionRef.current.active.includes(layerId)) requestLayer(layer);
  }, [requestLayer]);

  const clearFacilityLayers = useCallback(() => {
    stopAll();
    setLayerStates({});
    setSelection(emptyFacilitySelection());
    setSelectedFacility(null);
    setNotice("");
  }, [stopAll]);

  /** 기준이 바뀌었을 때 켜진 레이어를 한 번씩만 다시 찾는다. */
  const refreshFacilityLayers = useCallback(() => {
    const active = selectionRef.current.active;
    if (!active.length) return;
    stopAll();
    for (const id of active) {
      const layer = facilityLayers.find((item) => item.id === id);
      if (layer) requestLayer(layer);
    }
  }, [requestLayer, stopAll]);

  // 지도 자체가 바뀌면(다른 일정·다른 지도 인스턴스) 이전 중심 기준의 결과는
  // 더 이상 맞지 않는다. 진행 중 요청을 모두 취소하고 표시를 비운다.
  const firstScope = useRef(true);
  useEffect(() => {
    if (firstScope.current) { firstScope.current = false; return; }
    clearFacilityLayers();
  }, [scopeKey, clearFacilityLayers]);

  // 지도 중심이 확정된 뒤(드래그·확대가 끝난 뒤) 한 번만 다시 찾는다.
  // 카카오의 `idle`은 이동이 끝난 다음에만 일어나므로 스크롤·드래그 중에는
  // 요청하지 않는다.
  const activeCount = selection.active.length;
  useEffect(() => {
    if (provider !== "kakao" || !activeCount) return;
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    if (!map || !sdk?.event?.addListener || !sdk.event.removeListener) return;
    const onIdle = () => refreshFacilityLayers();
    sdk.event.addListener(map, "idle", onIdle);
    return () => sdk.event?.removeListener?.(map, "idle", onIdle);
  }, [provider, activeCount, kakaoMapRef, refreshFacilityLayers]);

  // 지도 렌더러는 레이어 목록을 모른다. 어떻게 읽히고 어떤 모양인지를 여기에서
  // 정해 넘긴다.
  const facilityMarkers = useMemo<FacilityMapMarker[]>(() => visibleFacilityMarkers(selection, FACILITY_MARKER_CAP).map((marker) => {
    const layer = facilityLayers.find((item) => item.id === marker.layerId);
    return { ...marker, layerLabel: layer?.label || "편의시설", glyph: layer?.glyph || "·", official: layer?.source === "official" };
  }), [selection]);
  const hiddenMarkerCount = useMemo(() => hiddenFacilityMarkerCount(selection, FACILITY_MARKER_CAP), [selection]);
  const capNotice = hiddenMarkerCount ? `가까운 ${FACILITY_MARKER_CAP}곳만 표시했어요.` : "";

  return {
    facilitySelection: selection,
    facilityLayerStates: layerStates,
    facilityMarkers,
    facilityNotice: notice || capNotice,
    selectedFacility,
    setSelectedFacility,
    toggleFacility,
    retryFacilityLayer,
    clearFacilityLayers,
    refreshFacilityLayers,
  };
}

function toFacilityMarker(layer: FacilityLayer, place: KakaoPlace, area: NearbySearchArea | null): FacilityLayerMarker {
  const latitude = Number(place.y), longitude = Number(place.x);
  const reported = place.distance ? Number(place.distance) : Number.NaN;
  const measured = area ? facilityDistanceMeters({ latitude: area.lat, longitude: area.lng }, { latitude, longitude }) : null;
  return {
    id: place.id,
    layerId: layer.id,
    name: place.place_name,
    address: place.road_address_name || place.address_name || "",
    destination: { latitude, longitude },
    distanceMeters: Number.isFinite(reported) ? reported : measured,
    source: PLACE_SEARCH_SOURCE,
    ...(place.place_url ? { detail: place.place_url } : {}),
  };
}
