"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type SmartSpotImageProps = {
  src?: string;
  title: string;
  region: string;
  tag: string;
  rank: number;
  contentId?: string;
  className?: string;
  showMeta?: boolean;
  children?: ReactNode;
};

function safeImageUrl(value?: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol === "http:") url.protocol = "https:";
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export default function SmartSpotImage({
  src,
  title,
  region,
  tag,
  rank,
  contentId = "",
  className = "",
  showMeta = true,
  children,
}: SmartSpotImageProps) {
  const [image, setImage] = useState(() => safeImageUrl(src));
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retried, setRetried] = useState(false);
  const settledRef = useRef(false);

  // 기본값만 두면 매개변수 타입이 리터럴 `() => false`로 좁혀져
  // 호출부의 `() => cancelled`를 받지 못한다.
  const loadOfficialFallback = useCallback(async (cancelled: () => boolean = () => false) => {
    const params = new URLSearchParams({ action: "spot-photo", region, title, tag });
    if (contentId) params.set("contentId", contentId);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`/api/wave?${params.toString()}`, { headers: { Accept: "application/json" }, signal: controller.signal });
      const data = response.ok ? await response.json() as { image?: string } : null;
      if (cancelled()) return;
      const nextImage = safeImageUrl(data?.image);
      if (nextImage) { setImage(nextImage); setRetried(true); setFailed(false); }
      else { setFailed(true); setLoading(false); }
    } catch {
      if (!cancelled()) { setFailed(true); setLoading(false); }
    } finally {
      window.clearTimeout(timeout);
    }
  }, [contentId, region, tag, title]);

  useEffect(() => {
    let cancelled = false;
    const nextImage = safeImageUrl(src);
    const frame = window.requestAnimationFrame(() => {
      setImage(nextImage);
      setFailed(false);
      setRetried(false);
      setLoading(true);
      settledRef.current = false;
      if (!nextImage) void loadOfficialFallback(() => cancelled);
    });
    const slowImage = window.setTimeout(() => {
      if (!cancelled && !settledRef.current && nextImage) {
        setImage("");
        void loadOfficialFallback(() => cancelled);
      }
    }, 8500);
    return () => { cancelled = true; window.cancelAnimationFrame(frame); window.clearTimeout(slowImage); };
  }, [src, loadOfficialFallback]);

  return <div className={`smart-spot-image${className ? ` ${className}` : ""}${loading ? " loading" : ""}${failed ? " failed" : ""}`}>
    {/* 관광사진 OpenAPI의 외부 URL은 HTTPS만 허용하고 Next 이미지 최적화 도메인 사전 열거 대신 직접 렌더링한다. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {image && <img src={image} alt={`${title} 관광사진`} onLoad={() => { settledRef.current = true; setLoading(false); }} onError={() => {
      if (!retried) { setImage(""); setLoading(true); void loadOfficialFallback(); }
      else { settledRef.current = true; setImage(""); setFailed(true); setLoading(false); }
    }} />}
    {loading && <span className="smart-image-skeleton" role="status" aria-label={`${title} 관광사진 불러오는 중`}><i /><i /><i /><b /></span>}
    {failed && <span className="smart-image-fallback"><i aria-hidden="true" /><small>공식 사진 준비 중</small><b>{title}</b><span>{region} · {tag} 여행</span></span>}
    {showMeta && <><em>{tag}</em><strong>{String(rank).padStart(2, "0")}</strong></>}
    {children}
  </div>;
}
