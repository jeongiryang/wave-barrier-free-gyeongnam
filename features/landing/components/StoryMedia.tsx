"use client";
import { useState, type ReactNode } from "react";
import { horizonPhotos } from "../horizon-photos";
import EditorialPhoto from "./EditorialPhoto";
/** Actual Hero scenery with attribution; the historical film artwork remains unmounted. */
export default function StoryMedia({ children, kind = "hero" }: { children: ReactNode; kind?: "hero" | "film" }) {
  const [failed, setFailed] = useState(false);
  if (kind === "hero") return <div className="story-media"><EditorialPhoto photo={horizonPhotos.coast} className="horizon-hero-photo" priority />{children}</div>;
  return <div className={`story-media${kind === "film" ? " story-film" : ""}`}>
    {!failed && <img src="/media/wave-story/garden-discovery-v2.webp" sizes="100vw" width={1672} height={941} loading="lazy"
      alt="" ref={node => { if (node?.complete && !node.naturalWidth) setFailed(true); }} onError={() => setFailed(true)} />}
    {children}
  </div>;
}
