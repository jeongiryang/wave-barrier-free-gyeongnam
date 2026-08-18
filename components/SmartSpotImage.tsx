"use client";

import { useEffect, useState } from "react";

export default function SmartSpotImage({ src, title, region, tag, rank }: { src?: string; title: string; region: string; tag: string; rank: number }) {
  const [image, setImage] = useState(src || "");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retried, setRetried] = useState(false);

  async function loadOfficialFallback(cancelled = () => false) {
    const params = new URLSearchParams({ action: "spot-photo", region, title });
    try {
      const response = await fetch(`/api/wave?${params.toString()}`, { headers: { Accept: "application/json" } });
      const data = response.ok ? await response.json() as { image?: string } : null;
      if (cancelled()) return;
      if (data?.image) { setImage(data.image); setRetried(true); setFailed(false); }
      else { setFailed(true); setLoading(false); }
    } catch {
      if (!cancelled()) { setFailed(true); setLoading(false); }
    }
  }

  useEffect(() => {
    let cancelled = false;
    setImage(src || "");
    setFailed(false);
    setRetried(false);
    setLoading(true);
    if (src) return () => { cancelled = true; };
    void loadOfficialFallback(() => cancelled);
    return () => { cancelled = true; };
  }, [src, title, region]);

  return <div className={`smart-spot-image${loading ? " loading" : ""}${failed ? " failed" : ""}`}>
    {image && <img src={image} alt={`${title} 관광사진`} onLoad={() => setLoading(false)} onError={() => {
      if (!retried) { setImage(""); setLoading(true); void loadOfficialFallback(); }
      else { setImage(""); setFailed(true); setLoading(false); }
    }} />}
    {loading && <span className="smart-image-skeleton" aria-label="관광사진 불러오는 중"><i /><i /><i /></span>}
    {failed && <span className="smart-image-fallback"><small>공식 사진 준비 중</small><b>{title}</b></span>}
    <em>{tag}</em><strong>{String(rank).padStart(2, "0")}</strong>
  </div>;
}
