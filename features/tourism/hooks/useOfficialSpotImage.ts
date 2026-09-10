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
  const fallbackRequest = useRef<{ key: string; controller: AbortController } | null>(null);
  const imageKey = JSON.stringify([src, contentId, region, title, tag]);

  const loadFallback = useCallback(async (cancelled: () => boolean = () => false) => {
    if (fallbackRequest.current?.key === imageKey) return;
    fallbackRequest.current?.controller.abort();
    const controller = new AbortController();
    const request = { key: imageKey, controller };
    fallbackRequest.current = request;
    settledRef.current = true;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const nextImage = await fetchOfficialSpotPhoto({ contentId, region, title, tag }, controller.signal);
      if (cancelled() || controller.signal.aborted || fallbackRequest.current !== request) return;
      if (nextImage) {
        setImage(nextImage);
        setRetried(true);
        setFailed(false);
      } else {
        setFailed(true);
        setLoading(false);
      }
    } catch {
      if (!cancelled() && fallbackRequest.current === request) {
        setFailed(true);
        setLoading(false);
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }, [contentId, region, tag, title, imageKey]);

  useEffect(() => {
    let cancelled = false;
    if (fallbackRequest.current && fallbackRequest.current.key !== imageKey) {
      fallbackRequest.current.controller.abort();
      fallbackRequest.current = null;
    }
    const nextImage = safeTourismImageUrl(src);
    const frame = window.requestAnimationFrame(() => {
      // A fast decode error may have already started the fallback before this frame.
      if (fallbackRequest.current?.key === imageKey) return;
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
      if (fallbackRequest.current?.key === imageKey) {
        fallbackRequest.current.controller.abort();
        fallbackRequest.current = null;
      }
    };
  }, [src, loadFallback, imageKey]);

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
        if (fallbackRequest.current?.key === imageKey) return;
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
