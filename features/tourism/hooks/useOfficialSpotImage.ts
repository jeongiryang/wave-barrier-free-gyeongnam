"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchOfficialSpotPhoto } from "../client/spot-photo";
import { safeTourismImageUrl } from "../image-url";

type SpotImageInput = {
  src?: string;
  title: string;
  region: string;
  tag: string;
  contentId: string;
};

export function useOfficialSpotImage({ src, title, region, tag, contentId }: SpotImageInput) {
  const [image, setImage] = useState(() => safeTourismImageUrl(src));
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retried, setRetried] = useState(false);
  const settledRef = useRef(false);

  const loadFallback = useCallback(async (cancelled: () => boolean = () => false) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const nextImage = await fetchOfficialSpotPhoto({ contentId, region, title, tag }, controller.signal);
      if (cancelled()) return;
      if (nextImage) {
        setImage(nextImage);
        setRetried(true);
        setFailed(false);
      } else {
        setFailed(true);
        setLoading(false);
      }
    } catch {
      if (!cancelled()) {
        setFailed(true);
        setLoading(false);
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }, [contentId, region, tag, title]);

  useEffect(() => {
    let cancelled = false;
    const nextImage = safeTourismImageUrl(src);
    const frame = window.requestAnimationFrame(() => {
      setImage(nextImage);
      setFailed(false);
      setRetried(false);
      setLoading(true);
      settledRef.current = false;
      if (!nextImage) void loadFallback(() => cancelled);
    });
    const slowImage = window.setTimeout(() => {
      if (!cancelled && !settledRef.current && nextImage) {
        setImage("");
        void loadFallback(() => cancelled);
      }
    }, 8500);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(slowImage);
    };
  }, [src, loadFallback]);

  return {
    image,
    loading,
    failed,
    onLoad: () => {
      settledRef.current = true;
      setLoading(false);
    },
    onError: () => {
      if (!retried) {
        setImage("");
        setLoading(true);
        void loadFallback();
      } else {
        settledRef.current = true;
        setImage("");
        setFailed(true);
        setLoading(false);
      }
    },
  };
}
