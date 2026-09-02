"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { landingRegions, type RegionPhoto } from "../content";
import { fetchRegionPhoto } from "../client/region-photo";
import { prefersReducedMotion } from "../../../lib/reduced-motion.js";

export function useLandingRegions() {
  const HOVER_INTENT_MS = 180;
  const [activeRegion, setActiveRegion] = useState("창원");
  const [previewRegion, setPreviewRegion] = useState<string | null>(null);
  const [regionPhotos, setRegionPhotos] = useState<Record<string, RegionPhoto | null | undefined>>({});
  const photoRequests = useRef(new Map<string, AbortController>());
  const photoCache = useRef(new Set<string>());
  const previewIntent = useRef<number | null>(null);
  const previewedRegion = useRef<string | null>(null);
  const active = useMemo(() => landingRegions.find((item) => item.name === activeRegion) ?? landingRegions[10], [activeRegion]);
  const preview = useMemo(() => landingRegions.find((item) => item.name === previewRegion) ?? null, [previewRegion]);

  const loadRegionPhoto = useCallback(async (region: string) => {
    if (photoCache.current.has(region) || photoRequests.current.has(region)) return;
    const controller = new AbortController();
    photoRequests.current.set(region, controller);
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 10000);
    try {
      const photo = await fetchRegionPhoto(region, controller.signal);
      if (photoRequests.current.get(region) !== controller) return;
      photoCache.current.add(region);
      setRegionPhotos((current) => ({ ...current, [region]: photo }));
    } catch {
      photoRequests.current.delete(region);
      if (timedOut || !controller.signal.aborted) {
        setRegionPhotos((current) => ({ ...current, [region]: null }));
      }
    } finally {
      window.clearTimeout(timeout);
      if (photoRequests.current.get(region) === controller) photoRequests.current.delete(region);
    }
  }, []);

  const cancelRegionPhoto = useCallback((region: string) => {
    photoRequests.current.get(region)?.abort();
    photoRequests.current.delete(region);
  }, []);

  const showRegionPreview = useCallback((region: string, immediate = false) => {
    if (previewIntent.current !== null) window.clearTimeout(previewIntent.current);
    const show = () => {
      previewIntent.current = null;
      previewedRegion.current = region;
      setPreviewRegion(region);
      void loadRegionPhoto(region);
    };
    if (immediate) show();
    else previewIntent.current = window.setTimeout(show, HOVER_INTENT_MS);
  }, [loadRegionPhoto]);

  const hideRegionPreview = useCallback((region: string) => {
    if (previewIntent.current !== null) {
      window.clearTimeout(previewIntent.current);
      previewIntent.current = null;
    }
    if (previewedRegion.current === region) {
      previewedRegion.current = null;
      setPreviewRegion(null);
    }
    if (!photoCache.current.has(region)) cancelRegionPhoto(region);
  }, [cancelRegionPhoto]);

  useEffect(() => () => {
    if (previewIntent.current !== null) window.clearTimeout(previewIntent.current);
    photoRequests.current.forEach((controller) => controller.abort());
    photoRequests.current.clear();
  }, []);

  function selectRegion(region: string) {
    void loadRegionPhoto(region);
    const update = () => setActiveRegion(region);
    const documentWithTransitions = document as Document & { startViewTransition?: (callback: () => void) => unknown };
    if (prefersReducedMotion() || !documentWithTransitions.startViewTransition) update();
    else documentWithTransitions.startViewTransition(update);
  }

  return { activeRegion, active, preview, regionPhotos, showRegionPreview, hideRegionPreview, selectRegion };
}
