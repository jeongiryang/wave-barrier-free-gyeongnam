"use client";
import { useState, type ReactNode } from "react";
/** Static brand artwork. Attribution is in the Landing source notes. */
export default function StoryMedia({ children, kind = "hero" }: { children: ReactNode; kind?: "hero" | "film" }) {
  const [failed, setFailed] = useState(false);
  return <div className={`story-media${kind === "film" ? " story-film" : ""}`}>
    {!failed && <img src={kind === "film" ? "/media/wave-story/garden-discovery-v2.webp" : "/media/wave-story/hero-coast-small.webp"}
      srcSet={kind === "hero" ? "/media/wave-story/hero-coast-small.webp 840w, /media/wave-story/hero-coast.webp 1672w" : undefined}
      sizes="100vw" width={1672} height={941} loading={kind === "film" ? "lazy" : undefined}
      fetchPriority={kind === "hero" ? "high" : "auto"} alt="" ref={node => { if (node?.complete && !node.naturalWidth) setFailed(true); }} onError={() => setFailed(true)} />}
    {children}
  </div>;
}
