"use client";

import { useState } from "react";
import GyeongnamRegionPicker from "../../../components/GyeongnamRegionPicker";
import { regionShowcasePhotos, regionShowcaseAlbums } from "../../landing/region-showcase-photos";
import { regionPhotoSource } from "../../landing/region-photo-sources";
import { useSitePreferences } from "../../../components/SitePreferences";

const featured = ["통영", "거제", "창원", "남해", "진주", "하동"];
const captions: Record<string, string> = { 통영: "바다와 골목을 함께", 거제: "섬을 따라 머무는 여행", 창원: "도시 가까이 만나는 자연", 남해: "느린 바다 여행", 진주: "남강을 따라 걷는 하루", 하동: "섬진강과 초록 사이" };

const interests = [
  { label: "바다", detail: "해안과 섬", theme: "nature", icon: "M3 14c3-6 6-6 9 0 3-6 6-6 9 0M3 19c3-2 6-2 9 0 3-2 6-2 9 0" },
  { label: "숲길", detail: "자연과 휴식", theme: "nature", icon: "M12 3 4 15h5v6h6v-6h5L12 3Z" },
  { label: "문화", detail: "전시와 역사", theme: "history", icon: "m3 9 9-6 9 6H3Zm2 3v7m7-7v7m7-7v7M3 21h18" },
  { label: "먹거리", detail: "지역의 맛", theme: "food", icon: "M5 3v7m4-7v7M3 7h8M7 10v11m11-18v18m0-18c-5 3-5 8 0 8" },
  { label: "실내", detail: "박물관과 전시", theme: "history", icon: "m3 11 9-8 9 8M5 10v11h14V10M9 21v-8h6v8" },
];

export default function PlannerRegionGallery({ value, onChange, onInterest, onFacilities, full = false }: { full?: boolean; value: string; onChange: (region: string) => void; onInterest: (theme: string) => void; onFacilities: () => void }) {
  const en = useSitePreferences().locale === "en";
  const [interest, setInterest] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const RegionHeading = full ? "h4" : "h3";
  const choices = full ? featured : featured.slice(0, 3);
  const featuredRegions = value && value !== "경남 전체" && !choices.includes(value) ? [value, ...choices.slice(1)] : choices;
  return <div className="reference-regions">
    {full && <div className="reference-interests" role="group" aria-label={en ? "Travel interests" : "관심 있는 여행 풍경"}>{interests.map(item => <button type="button" key={item.label} aria-pressed={interest === item.label} onClick={() => { setInterest(item.label); onInterest(item.theme); }}><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.icon} /></svg></i><span>{item.label}<small>{item.detail}</small></span></button>)}<button type="button" disabled={!value} onClick={onFacilities}><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="5" r="2" /><path d="M4 10h16m-8-3v7m-5 7 5-7 5 7" /></svg></i><span>편의 선택<small>필요한 시설</small></span></button></div>}
    {full && <div className="reference-section-label"><h3>지금 떠나기 좋은 지역</h3><button type="button" aria-expanded={expanded} aria-controls="reference-all-regions" onClick={() => setExpanded(!expanded)}>{expanded ? "접기" : "전체 보기"}</button></div>}
    <div className="reference-region-grid">{featuredRegions.map((name, index) => {
      const photo = name === "통영" ? regionShowcaseAlbums[name][1] || regionShowcasePhotos[name] : regionShowcasePhotos[name];
      return <article key={name} className={`reference-region-card${index === 0 ? " featured" : ""}`} data-selected={name === value || undefined}>
        {!failedImages.includes(photo.image) && <img lang="ko" src={photo.image} alt={`${name} · ${photo.title}`} width="800" height="500" loading="lazy" decoding="async" onError={() => setFailedImages(previous => [...previous, photo.image])} />}
        <div className="reference-region-copy" lang="ko"><RegionHeading>{name}</RegionHeading><p>{captions[name] || photo.title}</p></div>
        <button type="button" aria-label={`${name} 지역 선택`} aria-pressed={name === value} onClick={() => onChange(name)}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d={name === value ? "m5 12 4 4L19 6" : "M12 5v14M5 12h14"} /></svg></button>
        <a className="reference-photo-credit" href={regionPhotoSource(photo).href} target="_blank" rel="noopener noreferrer">{photo.photographer || "한국관광공사"} · 원본 ↗</a>
      </article>;
    })}</div>
    {!full && <div className="condition-region-field"><label><span>{en ? "Travel region" : "여행 지역"}</span><select value={value} onChange={event => onChange(event.target.value)}><option value="" disabled>{en ? "Choose a region" : "여행할 지역을 골라주세요"}</option>{["경남 전체", ...Object.keys(regionShowcasePhotos)].map(name => <option key={name} value={name}>{name}</option>)}</select></label><button type="button" aria-expanded={expanded} aria-controls="reference-all-regions" onClick={() => setExpanded(!expanded)}>{en ? "Choose on a map" : "지도에서 고르기"} ↗</button></div>}
    <div id="reference-all-regions" hidden={!full && !expanded}><GyeongnamRegionPicker value={value} onChange={onChange} includeAll compact /></div>
  </div>;
}
