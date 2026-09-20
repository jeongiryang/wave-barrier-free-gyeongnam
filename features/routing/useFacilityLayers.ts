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
import type { FacilityMapMarker, MapPlace } from "./types";
import { optionalPlannerJson } from "../planner/services/api";
import { CLIENT_BUDGET_MS } from "../../lib/request-budget.js";
import { lowFloorArrivalMarkers } from "../../lib/transport/low-floor-bus.js";

export type FacilityLayerState = "idle" | "loading" | "ready" | "partial" | "empty" | "error" | "location-unconfirmed";

type OfficialFacilityResponse = {
  status: "available" | "empty" | "invalid-request" | "provider-error" | "location-unconfirmed";
  contentId: string;
  kind?: "no-smoking";
  checkedAt: string;
  source: string;
  items: Array<{
    id: string; name?: string; address?: string; distanceMeters: number;
    destination: { latitude: number; longitude: number };
    institutionName?: string; note?: string; referenceDate: string;
    kind?: string; locationNote?: string; availableHours?: string; usageNote?: string;
  }>;
};

type ReturnStop = {
  nodeId: string;
  cityCode: string;
  name: string;
  point?: { lat: number; lng: number } | null;
  distance?: number | null;
};

type ReturnTransportResponse = {
  id?: string;
  status?: string;
  stops?: ReturnStop[];
  routes?: Array<{ routeName?: string; vehicles?: Array<{ vehicle?: string; seconds?: number | null; stopsAway?: number | null }> }>;
  arrivalCheckedAt?: string | null;
  moreStops?: boolean;
  moreArrivals?: boolean;
};

type OfficialResult = { state: FacilityLayerState; markers: FacilityLayerMarker[] };
const publicId = (id?: string) => Boolean(id && /^[1-9]\d{0,11}$/.test(id));

/** Each provider keeps its response contract; only public IDs leave this boundary. */
export async function loadOfficialFacilityLayer(layer: FacilityLayer, contentId: string, signal: AbortSignal): Promise<OfficialResult> {
  const result = (state: FacilityLayerState, markers: FacilityLayerMarker[] = []): OfficialResult => ({ state, markers });
  if (!publicId(contentId)) return result("location-unconfirmed");
  if (signal.aborted) return result("error");
  if (layer.id === "low-floor-bus-arrival") {
    const deadline = Date.now() + CLIENT_BUDGET_MS.returnTransport;
    const baseUrl = `/api/wave?action=return-transport&contentId=${encodeURIComponent(contentId)}`;
    const base = await optionalPlannerJson<ReturnTransportResponse>(baseUrl, { signal, timeoutMs: CLIENT_BUDGET_MS.returnTransport });
    if (signal.aborted || !base || base.id !== contentId) return result("error");
    if (base.status === "location-unconfirmed") return result("location-unconfirmed");
    if (base.status !== "stops" && base.status !== "empty") return result("error");
    if (!Array.isArray(base.stops)) return result("error");
    const stops = base.stops.slice(0, 4);
    if (!stops.length) return result(base.moreStops ? "partial" : "empty");
    const observations = await Promise.all(stops.map(async stop => {
      if (signal.aborted || Date.now() >= deadline || !stop.nodeId || !/^\d{2,8}$/.test(stop.cityCode)) return { stop, response: null };
      const response = await optionalPlannerJson<ReturnTransportResponse>(`${baseUrl}&nodeId=${encodeURIComponent(stop.nodeId)}&cityCode=${encodeURIComponent(stop.cityCode)}`, { signal, timeoutMs: Math.max(1, deadline - Date.now()) });
      return { stop, response };
    }));
    if (signal.aborted) return result("error");
    const valid = observations.filter((item): item is { stop: ReturnStop; response: ReturnTransportResponse } => Boolean(item.response && item.response.id === contentId && ["arrivals", "no-arrivals"].includes(item.response.status || "") && Array.isArray(item.response.routes)));
    if (!valid.length) return result("error");
    const markers = lowFloorArrivalMarkers(valid);
    const partial = Boolean(base.moreStops) || base.stops.length > stops.length || valid.length < stops.length || valid.some(item => item.response.moreArrivals);
    return result(partial ? "partial" : markers.length ? "ready" : "empty", markers);
  }
  const configurations: Record<string, { action: string; budget: number }> = {
    "no-smoking": { action: "smoking-area", budget: CLIENT_BUDGET_MS.smokingArea },
    "sanitary-supply": { action: "sanitary-supply", budget: CLIENT_BUDGET_MS.sanitarySupply },
    "trash-bin": { action: "trash-bin", budget: CLIENT_BUDGET_MS.trashBin },
  };
  const config = configurations[layer.id];
  if (!config) return result("error");
  const response = await optionalPlannerJson<OfficialFacilityResponse>(`/api/wave?action=${config.action}&contentId=${encodeURIComponent(contentId)}`, { signal, timeoutMs: config.budget });
  if (signal.aborted || !response || response.contentId !== contentId || (layer.id === "no-smoking" && response.kind !== "no-smoking")) return result("error");
  if (response.status === "location-unconfirmed") return result("location-unconfirmed");
  if (!Array.isArray(response.items)) return result("error");
  if (response.status === "empty" && response.items.length === 0) return result("empty");
  if (response.status !== "available") return result("error");
  if (!response.items.length || response.items.some(item => !item || !item.id ||
    !Number.isFinite(item.destination?.latitude) || !Number.isFinite(item.destination?.longitude) ||
    Math.abs(item.destination.latitude) > 90 || Math.abs(item.destination.longitude) > 180)) return result("error");
  const markers = response.items.map((item): FacilityLayerMarker => ({
    id: `${layer.id}-${item.id}`, layerId: layer.id,
    name: layer.id === "trash-bin" ? item.kind || layer.label : item.name || layer.label,
    address: item.locationNote || item.address || "", destination: item.destination,
    distanceMeters: item.distanceMeters, source: response.source, referenceDate: item.referenceDate,
    ...(item.kind ? { kind: item.kind } : {}), ...(item.locationNote ? { locationNote: item.locationNote } : {}),
    ...(item.institutionName ? { institutionName: item.institutionName } : {}), ...(item.note ? { note: item.note } : {}),
    ...(layer.id === "sanitary-supply" ? { detail: [item.availableHours, item.usageNote].filter(Boolean).join(" · ") } : {}),
  }));
  return result(markers.length ? "ready" : "empty", markers);
}

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
  /** 공식 관광지 ID. 서버는 이 ID로 공개 좌표를 다시 확인한다. */
  contentId?: string;
  /** `derived` 레이어가 새 조회 없이 마커를 뽑아낼 이미 받아온 장소 목록. */
  places: MapPlace[];

}

export function useFacilityLayers({ kakaoMapRef, provider, scopeKey, contentId, places }: FacilityLayersOptions) {
  const [selection, setSelection] = useState<FacilityLayerSelection>(() => emptyFacilitySelection());
  const [layerStates, setLayerStates] = useState<Record<string, FacilityLayerState>>({});
  const [notice, setNotice] = useState("");
  const [selectedFacility, setSelectedFacility] = useState<FacilityMapMarker | null>(null);

  // 레이어마다 독립된 세대 번호를 둔다. 한 레이어를 끄거나 다시 요청해도 다른
  // 레이어의 진행 중 요청은 건드리지 않는다.
  const generations = useRef<Record<string, number>>({});
  const timers = useRef<Record<string, number>>({});
  const controllers = useRef<Record<string, AbortController>>({});
  const selectionRef = useRef(selection);
  useEffect(() => { selectionRef.current = selection; }, [selection]);
  const placesRef = useRef(places);
  useEffect(() => { placesRef.current = places; }, [places]);

  const stopLayer = useCallback((layerId: string) => {
    generations.current[layerId] = (generations.current[layerId] || 0) + 1;
    const timer = timers.current[layerId];
    if (timer !== undefined) window.clearTimeout(timer);
    delete timers.current[layerId];
    controllers.current[layerId]?.abort();
    delete controllers.current[layerId];
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
      delete controllers.current[layer.id];
      // Invalidate late SDK callbacks after timeout as well as old HTTP replies.
      generations.current[layer.id] = token + 1;
      setLayerStates((current) => ({ ...current, [layer.id]: next }));
      setSelection((current) => next === "error"
        ? failFacilityLayer(current, layer.id)
        : mergeFacilityMarkers(current, layer.id, markers || []));
    };

    setLayerStates((current) => ({ ...current, [layer.id]: "loading" }));

    if (layer.source === "derived") {
      // 새 조회를 하지 않는다. 이미 받아온 장소 목록에서 조건에 맞는 곳만 뽑는다.
      const key = layer.derivedKey;
      const map = kakaoMapRef.current;
      const center = key && map?.getCenter ? map.getCenter() : null;
      const origin = center ? { latitude: center.getLat(), longitude: center.getLng() } : null;
      const markers = (key ? placesRef.current : [])
        .filter((place) => place.accessibility?.some((item) => item.key === key && item.state === "confirmed"))
        .map((place) => toDerivedMarker(layer, place, origin))
        .filter((marker): marker is FacilityLayerMarker => marker !== null);
      settle(markers.length ? "ready" : "empty", markers);
      return;
    }

    if (layer.source === "official") {
      const selectedId = publicId(contentId) ? contentId! : placesRef.current.find(place => publicId(place.id))?.id || "";
      const controller = new AbortController();
      controllers.current[layer.id] = controller;
      void loadOfficialFacilityLayer(layer, selectedId, controller.signal)
        .then(({ state, markers }) => settle(state, markers))
        .catch(() => settle("error"));
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
  }, [contentId, kakaoMapRef, stopLayer]);

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

  /** 패널을 닫을 때 완료된 표시는 유지하되 진행 중 네트워크 요청은 모두 취소한다. */
  const cancelFacilityRequests = useCallback(() => {
    const loading = [...new Set([...Object.keys(controllers.current), ...Object.keys(timers.current)])];
    for (const id of loading) stopLayer(id);
    if (!loading.length) return;
    setLayerStates((states) => Object.fromEntries(Object.entries(states).map(([id, state]) => [id, state === "loading" ? "error" : state])));
    setSelection((current) => loading.reduce((next, id) => failFacilityLayer(next, id), current));
  }, [stopLayer]);

  /** 기준이 바뀌었을 때 켜진 레이어를 한 번씩만 다시 찾는다. */
  const refreshFacilityLayers = useCallback(() => {
    const active = selectionRef.current.active;
    if (!active.length) return;
    for (const id of active) {
      const layer = facilityLayers.find((item) => item.id === id);
      // 공식 레이어의 기준은 지도 중심이 아니라 선택한 공개 관광지다. 지도 이동
      // 때 같은 API를 다시 부르지 않고, 장소 ID가 바뀌는 scope 효과에서만 갱신한다.
      if (layer && layer.source !== "official") {
        stopLayer(id);
        requestLayer(layer);
      }
    }
  }, [requestLayer, stopLayer]);

  // 지도 자체가 바뀌면(다른 일정·다른 지도 인스턴스) 이전 중심 기준의 결과는
  // 더 이상 맞지 않는다. 진행 중 요청을 모두 취소하고 표시를 비운다.
  const firstScope = useRef(true);
  useEffect(() => {
    if (firstScope.current) { firstScope.current = false; return; }
    clearFacilityLayers();
  }, [scopeKey, contentId, clearFacilityLayers]);

  // 지도 중심이 확정된 뒤(드래그·확대가 끝난 뒤) 한 번만 다시 찾는다.
  // 카카오의 `idle`은 이동이 끝난 다음에만 일어나므로 스크롤·드래그 중에는
  // 요청하지 않는다.
  const activeCount = selection.active.length;
  useEffect(() => {
    if (provider !== "kakao" || !activeCount) return;
    const map = kakaoMapRef.current;
    const sdk = window.kakao?.maps;
    if (!map || !sdk?.event?.addListener || !sdk.event.removeListener) return;
    const onIdle = () => {
      // 공식 도착정보는 지도 드래그마다 다시 호출하지 않는다. 사용자가 끄고 켜거나
      // 명시적으로 재시도할 때만 갱신해 제공처 한도를 지킨다.
      for (const id of selectionRef.current.active) {
        const layer = facilityLayers.find((item) => item.id === id);
        if (layer && layer.source !== "official") requestLayer(layer);
      }
    };
    sdk.event.addListener(map, "idle", onIdle);
    return () => sdk.event?.removeListener?.(map, "idle", onIdle);
  }, [provider, activeCount, kakaoMapRef, refreshFacilityLayers, requestLayer]);

  // 지도 렌더러는 레이어 목록을 모른다. 어떻게 읽히고 어떤 모양인지를 여기에서
  // 정해 넘긴다.
  const facilityMarkers = useMemo<FacilityMapMarker[]>(() => visibleFacilityMarkers(selection, FACILITY_MARKER_CAP).map((marker) => {
    const layer = facilityLayers.find((item) => item.id === marker.layerId);
    // 지도 핀 모양은 두 가지뿐이다(사각·원형). `derived`는 이미 확인된 공식
    // 관광정보에서 온 값이라 place-search(카카오 장소 검색)의 원형 핀과는
    // 구분해야 하므로, 새 모양을 더하는 대신 official과 같은 사각 핀을 쓴다.
    return { ...marker, layerLabel: layer?.label || "편의시설", glyph: layer?.glyph || "·", official: layer?.source === "official" || layer?.source === "derived", compact: marker.layerId === "trash-bin" };
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
    cancelFacilityRequests,
    refreshFacilityLayers,
  };
}

/** `derived` 레이어 전용. 좌표가 없거나 범위를 벗어난 장소는 마커로 만들지 않는다. */
function toDerivedMarker(layer: FacilityLayer, place: MapPlace, origin: { latitude: number; longitude: number } | null): FacilityLayerMarker | null {
  const latitude = Number(place.mapY), longitude = Number(place.mapX);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  const destination = { latitude, longitude };
  const detail = place.accessibility?.find((item) => item.key === layer.derivedKey)?.detail;
  return {
    id: `${layer.id}-${place.id}`,
    layerId: layer.id,
    name: place.name,
    address: place.address || "",
    destination,
    distanceMeters: origin ? facilityDistanceMeters(origin, destination) : null,
    source: "이미 조회한 여행지 목록",
    ...(detail ? { detail } : {}),
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
