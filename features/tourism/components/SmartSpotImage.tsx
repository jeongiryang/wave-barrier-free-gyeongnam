"use client";

import type { ReactNode } from "react";
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
  const photo = useOfficialSpotImage({ src, title, region, tag, contentId });
  return <div className={`smart-spot-image${className ? ` ${className}` : ""}${photo.loading ? " loading" : ""}${photo.failed ? " failed" : ""}`}>
    {/* 공식 관광사진 외부 URL은 HTTPS만 허용하며 정규화는 tourism domain에서 수행한다. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {photo.image && <img src={photo.image} alt={`${title} 관광사진`} onLoad={photo.onLoad} onError={photo.onError} />}
    {photo.loading && <span className="smart-image-skeleton" role="status" aria-label={`${title} 관광사진 불러오는 중`}><i /><i /><i /><b /></span>}
    {photo.failed && <span className="smart-image-fallback"><i aria-hidden="true" /><small>공식 사진 준비 중</small><b>{title}</b><span>{region} · {tag} 여행</span></span>}
    {showMeta && <><em>{tag}</em><strong>{String(rank).padStart(2, "0")}</strong></>}
    {children}
  </div>;
}
