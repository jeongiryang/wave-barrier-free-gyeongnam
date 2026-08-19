"use client";

import { useCallback, useState } from "react";
import { useLocationSearchRequest } from "./useLocationSearchRequest";

export type PointPicker = "origin" | "destination" | null;

export function useLocationSearch(region: string) {
  const [pointPicker, setPointPicker] = useState<PointPicker>(null);
  const search = useLocationSearchRequest(region);
  const { clearSearchRequest } = search;
  const clearLocationSearch = useCallback(() => {
    setPointPicker(null);
    clearSearchRequest();
  }, [clearSearchRequest]);
  return { pointPicker, setPointPicker, ...search, clearLocationSearch };
}
