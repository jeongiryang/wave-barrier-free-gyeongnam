"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function SmartSpotImage({ src, title, region, tag, rank }: { src?: string; title: string; region: string; tag: string; rank: number }) {
  const [image, setImage] = useState(src || "");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retried, setRetried] = useState(false);
  const settledRef = useRef(false);

  const loadOfficialFallback = useCallback(async (cancelled = () => false) => {
    const params = new URLSearchParams({ action: "spot-photo", region, title, tag });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`/api/wave?${params.toString()}`, { headers: { Accept: "application/json" }, signal: controller.signal });
      const data = response.ok ? await response.json() as { image?: string } : null;
      if (cancelled()) return;
      if (data?.image) { setImage(data.image); setRetried(true); setFailed(false); }
      else { setFailed(true); setLoading(false); }
    } catch {
      if (!cancelled()) { setFailed(true); setLoading(false); }
    } finally {
      window.clearTimeout(timeout);
    }
  }, [region, tag, title]);

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      setImage(src || "");
      setFailed(false);
      setRetried(false);
      setLoading(true);
      settledRef.current = false;
      if (!src) void loadOfficialFallback(() => cancelled);
    });
    const slowImage = window.setTimeout(() => {
      if (!cancelled && !settledRef.current && src) {
        setImage("");
        void loadOfficialFallback(() => cancelled);
      }
    }, 8500);
    return () => { cancelled = true; window.cancelAnimationFrame(frame); window.clearTimeout(slowImage); };
  }, [src, loadOfficialFallback]);

  return <div className={`smart-spot-image${loading ? " loading" : ""}${failed ? " failed" : ""}`}>
    {/* 관광사진 OpenAPI가 반환하는 외부 URL은 Next 이미지 최적화 도메인을 사전 열거할 수 없다. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {image && <img src={image} alt={`${title} 관광사진`} onLoad={() => { settledRef.current = true; setLoading(false); }} onError={() => {
      if (!retried) { setImage(""); setLoading(true); void loadOfficialFallback(); }
      else { settledRef.current = true; setImage(""); setFailed(true); setLoading(false); }
    }} />}
    {loading && <span className="smart-image-skeleton" role="status" aria-label={`${title} 관광사진 불러오는 중`}><i /><i /><i /><b /></span>}
    {failed && <span className="smart-image-fallback"><i aria-hidden="true" /><small>공식 사진 준비 중</small><b>{title}</b><span>{region} · {tag} 여행</span></span>}
    <em>{tag}</em><strong>{String(rank).padStart(2, "0")}</strong>
  </div>;
}
