"use client";
import { useState } from "react";
import type { EditorialSource } from "../horizon-photos";

/** An actual tourism photograph with its own attribution; never facility evidence. */
export default function EditorialPhoto({ photo, className = "", priority = false }: { photo: EditorialSource; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <figure className={`editorial-photo ${className}`}>
    {!failed && <img src={photo.image} alt={photo.title} lang="ko" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" ref={node => { if (node?.complete && !node.naturalWidth) setFailed(true); }} onError={() => setFailed(true)} />}
    <figcaption lang="ko">{photo.title}{failed && " · 사진을 불러오지 못했어요"}</figcaption>
  </figure>;
}
