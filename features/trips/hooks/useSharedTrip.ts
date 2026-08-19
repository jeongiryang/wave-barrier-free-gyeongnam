"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { fetchSharedTrip } from "../client/shared-trip";
import type { SharedTrip } from "../types";

export function useSharedTrip() {
  const params = useParams<{ id: string }>();
  const [trip, setTrip] = useState<SharedTrip | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!params.id) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort("timeout"), 35000);
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        setTrip(null);
        setError("");
      }
      return fetchSharedTrip(params.id, controller.signal);
    }).then(setTrip).catch((reason: Error) => {
      if (controller.signal.reason === "unmount") return;
      setError(controller.signal.aborted ? "공식 관광정보 확인이 평소보다 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요." : reason.message);
    }).finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort("unmount"); };
  }, [params.id, retry]);

  const scheduledDates = useMemo(() => trip ? [...new Set(Object.values(trip.selections.scheduleAssignments || {}).filter(Boolean))].sort() : [], [trip]);
  return { trip, error, scheduledDates, retry: () => setRetry((current) => current + 1) };
}
