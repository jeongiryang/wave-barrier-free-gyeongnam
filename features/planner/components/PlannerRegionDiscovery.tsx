"use client";
import { useState } from "react";
import MobileDisclosure from "../../../components/MobileDisclosure";
import { regionShowcasePhotos } from "../../landing/region-showcase-photos";
import { regionPhotoSource } from "../../landing/region-photo-sources";
import { useSitePreferences } from "../../../components/SitePreferences";
import { DECLINING_REGION_LABEL, decliningRegionSourceLabel, decliningRegionsFirst, isDecliningRegion } from "../declining-regions";
const featured = ["통영", "거제", "남해", "진주", "창원", "하동"];
const all = [...featured, ...Object.keys(regionShowcasePhotos).filter(name => !featured.includes(name))];
export default function PlannerRegionGallery({ value, onChange, full = false, disabled = false }: { full?: boolean; value: string; onChange: (region: string) => void; onInterest: (theme: string) => void; onFacilities: () => void; disabled?: boolean }) {
  const en = useSitePreferences().locale === "en";
  const [expanded, setExpanded] = useState(false);
  const [decliningFirst, setDecliningFirst] = useState(false);
  const ordered = decliningFirst ? decliningRegionsFirst(all) : all;
  const names = decliningFirst ? ordered : expanded ? ordered : full ? featured : featured.slice(0, 3);
  return <div className="simple-region-discovery">
    <button type="button" className="declining-region-filter" disabled={disabled} aria-pressed={decliningFirst} onClick={() => setDecliningFirst(value => !value)}>{decliningFirst ? "인구감소지역 먼저 보는 중" : "이 지역들 먼저 보기"}</button>
    <div className="simple-region-grid" id="planner-region-options">{names.map(name => {
      const photo = regionShowcasePhotos[name];
      return <article className="simple-region" key={name}>
        <button type="button" className="simple-region-link" lang="ko" disabled={disabled} onClick={() => onChange(name)} aria-label={`${name} 지역 선택`} aria-pressed={name === value}>
          <img ref={node => { if (node?.complete && !node.naturalWidth) node.style.visibility = "hidden"; }} onError={event => { event.currentTarget.style.visibility = "hidden"; }} src={photo.image} alt="" width="800" height="600" loading="lazy" decoding="async" />
          <div><h3>{name}</h3></div><span className="simple-region-arrow" aria-hidden="true">{name === value ? "✓" : "→"}</span>
        </button>
        <MobileDisclosure title={en ? "Photo & region" : "출처·정보"} className="simple-region-metadata">
        {isDecliningRegion(name) && <div className="declining-region-notice" lang="ko"><p>{DECLINING_REGION_LABEL}</p><small>{decliningRegionSourceLabel()}</small></div>}
        <a className="simple-region-credit" lang="ko" href={regionPhotoSource(photo).href} target="_blank" rel="noopener noreferrer">{photo.photographer || "한국관광공사"} · <span lang={en ? "en" : "ko"}>{en ? "Source" : "원본"}</span> ↗</a>
        </MobileDisclosure>
      </article>;
    })}</div>
    {!decliningFirst && <button type="button" className="simple-show-regions" disabled={disabled} aria-expanded={expanded} aria-controls="planner-region-options" onClick={() => setExpanded(!expanded)}>{expanded ? en ? "Show fewer" : "접기" : en ? "All 18 regions" : "전체 18개 지역"}<span aria-hidden="true">{expanded ? "−" : "+"}</span></button>}
  </div>;
}
