"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RoutePoint } from "../../routing/types";
import { movePlaceWithinDay, placeMoveAvailability, reconcilePlaceOrder } from "../optimization/manual-order.js";
import { explainVisitOrder, optimizeVisitOrder } from "../optimization/visit-order.js";
import type { Place } from "../types";

const TRIP_ORDER_KEY = "wave-trip-order-v1";
type OrderMode = "auto" | "manual";

function readStoredOrder(): { mode: OrderMode; ids: string[] } {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TRIP_ORDER_KEY) || "{}") as { mode?: unknown; ids?: unknown };
    return {
      mode: parsed.mode === "manual" ? "manual" : "auto",
      ids: Array.isArray(parsed.ids) ? parsed.ids.filter((id): id is string => typeof id === "string") : [],
    };
  } catch {
    return { mode: "auto", ids: [] };
  }
}

export function useOptimizedTripOrder({ savedPlaces, saved, savedStorageReady, origin, accessibilityProfileCount, scheduleAssignments, defaultDay }: {
  savedPlaces: Place[];
  saved: string[];
  savedStorageReady: boolean;
  origin: RoutePoint;
  accessibilityProfileCount: number;
  scheduleAssignments: Record<string, string>;
  defaultDay: string;
}) {
  const [orderMode, setOrderMode] = useState<OrderMode>("auto");
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [orderStorageReady, setOrderStorageReady] = useState(false);
  const [orderNotice, setOrderNotice] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = readStoredOrder();
      setOrderMode(stored.mode);
      setManualOrder(stored.ids);
      setOrderStorageReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const autoOrderedPlaces = useMemo(
    () => optimizeVisitOrder(savedPlaces, { origin, accessibilityWeight: accessibilityProfileCount ? 0.12 : 0 }),
    [accessibilityProfileCount, origin, savedPlaces],
  );
  const autoOrderIds = useMemo(() => autoOrderedPlaces.map((place) => place.id), [autoOrderedPlaces]);
  const reconciledManualOrder = useMemo(
    () => reconcilePlaceOrder(saved, manualOrder),
    [manualOrder, saved],
  );
  const activeOrderIds = useMemo(
    () => orderMode === "manual"
      ? reconciledManualOrder.filter((id) => savedPlaces.some((place) => place.id === id))
      : autoOrderIds,
    [autoOrderIds, orderMode, reconciledManualOrder, savedPlaces],
  );
  const orderedSavedPlaces = useMemo(() => {
    const byId = new Map(savedPlaces.map((place) => [place.id, place]));
    return activeOrderIds.map((id) => byId.get(id)).filter((place): place is Place => Boolean(place));
  }, [activeOrderIds, savedPlaces]);

  useEffect(() => {
    if (!orderStorageReady || !savedStorageReady) return;
    try {
      window.localStorage.setItem(TRIP_ORDER_KEY, JSON.stringify({ mode: orderMode, ids: reconciledManualOrder }));
    } catch {
      // 저장소가 차단돼도 현재 탭의 편집 순서는 유지한다.
    }
  }, [orderMode, orderStorageReady, reconciledManualOrder, savedStorageReady]);

  const movePlace = useCallback((placeId: string, direction: "up" | "down") => {
    const next = movePlaceWithinDay(activeOrderIds, placeId, direction, scheduleAssignments, defaultDay);
    if (next.every((id, index) => id === activeOrderIds[index])) return false;
    setManualOrder(reconcilePlaceOrder(saved, next));
    setOrderMode("manual");
    setOrderNotice(`${savedPlaces.find((place) => place.id === placeId)?.name || "장소"} 순서를 ${direction === "up" ? "앞으로" : "뒤로"} 옮겼습니다.`);
    return true;
  }, [activeOrderIds, defaultDay, saved, savedPlaces, scheduleAssignments]);

  const movementFor = useCallback((placeId: string) => (
    placeMoveAvailability(activeOrderIds, placeId, scheduleAssignments, defaultDay)
  ), [activeOrderIds, defaultDay, scheduleAssignments]);

  const restoreAutoOrder = useCallback(() => {
    setManualOrder(reconcilePlaceOrder(saved, autoOrderIds));
    setOrderMode("auto");
    setOrderNotice("이동 부담을 고려한 자동 순서로 되돌렸습니다.");
  }, [autoOrderIds, saved]);

  const orderExplanation = useMemo(
    () => orderMode === "manual"
      ? "내가 정한 방문 순서입니다. 날짜별 이동시간은 순서가 바뀔 때마다 다시 계산합니다."
      : explainVisitOrder(orderedSavedPlaces, origin),
    [orderMode, orderedSavedPlaces, origin],
  );

  return {
    orderedSavedPlaces,
    orderedPlaceIds: orderedSavedPlaces.map((place) => place.id),
    orderExplanation,
    orderMode,
    orderNotice,
    movePlace,
    movementFor,
    restoreAutoOrder,
  };
}
