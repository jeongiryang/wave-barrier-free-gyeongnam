"use client";

import type { ReactNode } from "react";
import { useSitePreferences } from "../../preferences/context";
import { useOfficialSpotImage } from "../hooks/useOfficialSpotImage";

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

export default function SmartSpotImage({
  src, title, region, tag, rank, contentId = "", className = "", showMeta = true, children,
}: SmartSpotImageProps) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const photo = useOfficialSpotImage({ src, title, region, tag, contentId });
  return <div className={`smart-spot-image${className ? ` ${className}` : ""}${photo.loading ? " loading" : ""}${photo.failed ? " failed" : ""}`}>
    {/* 공식 관광사진 외부 URL은 HTTPS만 허용하며 정규화는 tourism domain에서 수행한다. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {photo.image && <img src={photo.image} alt={en ? `Photo of ${title}` : `${title} 관광사진`} width="800" height="600" loading="lazy" decoding="async" onLoad={photo.onLoad} onError={photo.onError} />}
    {photo.loading && <span className="smart-image-skeleton" role="status" aria-label={en ? `Loading photo of ${title}` : `${title} 관광사진 불러오는 중`}><i /><i /><i /><b /></span>}
    {photo.failed && <span className="smart-image-fallback"><i aria-hidden="true" /><small>{en ? "Official photo unavailable" : "공식 사진을 확인할 수 없어요"}</small><b lang={/[가-힣]/.test(title) ? "ko" : undefined}>{title}</b><span><span lang={/[가-힣]/.test(region) ? "ko" : undefined}>{region}</span> · {tag}{en ? "" : " 여행"}</span></span>}
    {showMeta && <><em>{tag}</em><strong>{String(rank).padStart(2, "0")}</strong></>}
    {children}
  </div>;
}
