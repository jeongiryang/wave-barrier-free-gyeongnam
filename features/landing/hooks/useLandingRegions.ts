"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { landingRegions, type RegionPhoto } from "../content";
import { fetchRegionPhoto } from "../client/region-photo";

export function useLandingRegions() {
  const [activeRegion, setActiveRegion] = useState("창원");
  const [previewRegion, setPreviewRegion] = useState<string | null>(null);
  const [regionPhotos, setRegionPhotos] = useState<Record<string, RegionPhoto | null | undefined>>({});
  const photoRequests = useRef(new Set<string>());
  const active = useMemo(() => landingRegions.find((item) => item.name === activeRegion) ?? landingRegions[10], [activeRegion]);
  const preview = useMemo(() => landingRegions.find((item) => item.name === previewRegion) ?? null, [previewRegion]);

  const loadRegionPhoto = useCallback(async (region: string) => {
    if (photoRequests.current.has(region)) return;
    photoRequests.current.add(region);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const photo = await fetchRegionPhoto(region, controller.signal);
      setRegionPhotos((current) => ({ ...current, [region]: photo }));
    } catch {
      photoRequests.current.delete(region);
      setRegionPhotos((current) => ({ ...current, [region]: null }));
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  function selectRegion(region: string) {
    const update = () => setActiveRegion(region);
    const documentWithTransitions = document as Document & { startViewTransition?: (callback: () => void) => unknown };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !documentWithTransitions.startViewTransition) update();
    else documentWithTransitions.startViewTransition(update);
  }

  return { activeRegion, active, preview, regionPhotos, setPreviewRegion, loadRegionPhoto, selectRegion };
}
