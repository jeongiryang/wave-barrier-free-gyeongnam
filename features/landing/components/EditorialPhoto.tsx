"use client";
import { useState } from "react";
import type { EditorialSource } from "../horizon-photos";
import { regionPhotoSource } from "../region-photo-sources";

/** An actual tourism photograph with its own attribution; never facility evidence. */
export default function EditorialPhoto({ photo, className = "", priority = false }: { photo: EditorialSource; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <figure className={`editorial-photo ${className}`}>
    {!failed && <img src={photo.image} alt={photo.title} lang="ko" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" ref={node => { if (node?.complete && !node.naturalWidth) setFailed(true); }} onError={() => setFailed(true)} />}
    <figcaption lang="ko">{photo.title}{photo.photographer ? ` · ${photo.photographer}` : ""}{!photo.license && " · ⓒ한국관광공사"} <a href={photo.sourceUrl || regionPhotoSource(photo).href} target="_blank" rel="noopener noreferrer">사진 원본<span className="sr-only"> · {photo.title}, 새 탭</span></a>{photo.license && <a href="/policies#horizon-photo-credits">{photo.license}<span className="sr-only"> · 변경 및 이용조건</span></a>}{failed && " · 사진을 불러오지 못했어요"}</figcaption>
  </figure>;
}
