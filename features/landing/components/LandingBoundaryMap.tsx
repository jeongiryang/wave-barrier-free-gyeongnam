"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import type { RegionBoundarySurfaceProps } from "./RegionBoundarySurface";

export default function LandingBoundaryMap(props: RegionBoundarySurfaceProps) {
  const root = useRef<HTMLDivElement>(null);
  const [Surface, setSurface] = useState<ComponentType<RegionBoundarySurfaceProps> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false, started = false;
    const load = () => {
      if (started) return;
      started = true;
      void import("./RegionBoundarySurface").then((module) => { if (!cancelled) setSurface(() => module.default); })
        .catch(() => { if (!cancelled) setFailed(true); });
    };
    if (!window.IntersectionObserver) { load(); return () => { cancelled = true; }; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { load(); observer.disconnect(); }
    }, { rootMargin: "240px" });
    if (root.current) observer.observe(root.current);
    return () => { cancelled = true; observer.disconnect(); };
  }, []);
  return <div className="landing-boundary-map" ref={root}>
    {Surface ? <Surface {...props} /> : <p className="region-boundary-status" role="status">
      {props.english
        ? failed ? "The map could not load. Start your trip using the region list below." : "Preparing the map. You can already use the region list below."
        : failed ? "지도를 불러오지 못했습니다. 아래 지역 목록에서 여행을 시작하세요." : "지역 지도를 준비하고 있습니다. 아래 목록은 바로 사용할 수 있습니다."}
    </p>}
  </div>;
}
