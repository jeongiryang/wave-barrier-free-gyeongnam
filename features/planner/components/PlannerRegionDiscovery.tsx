"use client";
import { useState } from "react";
import { regionShowcasePhotos } from "../../landing/region-showcase-photos";
import { regionPhotoSource } from "../../landing/region-photo-sources";
import { useSitePreferences } from "../../../components/SitePreferences";
const featured = ["통영", "거제", "남해", "진주", "창원", "하동"];
const all = [...featured, ...Object.keys(regionShowcasePhotos).filter(name => !featured.includes(name))];
export default function PlannerRegionGallery({ value, onChange, full = false, disabled = false }: { full?: boolean; value: string; onChange: (region: string) => void; onInterest: (theme: string) => void; onFacilities: () => void; disabled?: boolean }) {
  const en = useSitePreferences().locale === "en";
  const [expanded, setExpanded] = useState(false);
  const names = expanded ? all : full ? featured : featured.slice(0, 3);
  return <div className="simple-region-discovery">
    <div className="simple-region-grid" id="planner-region-options">{names.map(name => {
      const photo = regionShowcasePhotos[name];
      return <article className="simple-region" key={name}>
        <button type="button" className="simple-region-link" lang="ko" disabled={disabled} onClick={() => onChange(name)} aria-label={`${name} 지역 선택`} aria-pressed={name === value}>
          <img ref={node => { if (node?.complete && !node.naturalWidth) node.style.visibility = "hidden"; }} onError={event => { event.currentTarget.style.visibility = "hidden"; }} src={photo.image} alt="" width="800" height="600" loading="lazy" decoding="async" />
          <div><h3>{name}</h3></div><span className="simple-region-arrow" aria-hidden="true">{name === value ? "✓" : "→"}</span>
        </button>
        <a className="simple-region-credit" lang="ko" href={regionPhotoSource(photo).href} target="_blank" rel="noopener noreferrer">{photo.photographer || "한국관광공사"} · <span lang={en ? "en" : "ko"}>{en ? "Source" : "원본"}</span> ↗</a>
      </article>;
    })}</div>
    <button type="button" className="simple-show-regions" disabled={disabled} aria-expanded={expanded} aria-controls="planner-region-options" onClick={() => setExpanded(!expanded)}>{expanded ? en ? "Show fewer" : "접기" : en ? "All 18 regions" : "전체 18개 지역"}<span aria-hidden="true">{expanded ? "−" : "+"}</span></button>
  </div>;
}
