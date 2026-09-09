"use client";

import { useState } from "react";
import GyeongnamRegionPicker from "../../../components/GyeongnamRegionPicker";
import { useSitePreferences } from "../../../components/SitePreferences";
import { regionShowcasePhotos } from "../../landing/region-showcase-photos";
import { regionPhotoSource } from "../../landing/region-photo-sources";
import { regionNames } from "../../../lib/gyeongnam-region-names";

/** Destination imagery is editorial; the selected region remains explicit. */
export default function PlannerRegionDiscovery({ value, onChange }: { value: string; onChange: (region: string) => void }) {
  const en = useSitePreferences().locale === "en";
  const name = regionShowcasePhotos[value] ? value : "창원";
  const photo = regionShowcasePhotos[name];
  const [failedImage, setFailedImage] = useState("");
  return <div className="planner-region-discovery">
    <figure className="planner-destination-image">
      {failedImage !== photo.image && <img key={photo.image} src={photo.image} width="1000" height="800" decoding="async" alt={`${name} · ${photo.title}`} onError={() => setFailedImage(photo.image)} ref={node => { if (node?.complete && !node.naturalWidth) setFailedImage(photo.image); }} />}
      <div className="planner-destination-caption">
        <span>{value ? en ? "YOUR DESTINATION" : "이번 여행의 시작" : en ? "FIND YOUR GYEONGNAM" : "마음이 머무는 곳으로"}</span>
        <strong>{!value || value === "경남 전체" ? en ? "Gyeongnam" : "경남" : en ? regionNames[name] : name}</strong>
        <p lang="ko">{name} · {photo.title}</p>
      </div>
      <figcaption><span lang="ko">{photo.photographer || "한국관광공사"}</span> · <a href={regionPhotoSource(photo).href} target="_blank" rel="noopener noreferrer">{en ? "ⓒKTO · original photo ↗" : "ⓒ한국관광공사 · 사진 원본 ↗"}</a>{failedImage === photo.image && <span> · {en ? "Photo unavailable" : "사진을 불러오지 못했어요"}</span>}</figcaption>
    </figure>
    <div className="planner-destination-choices">
      <p>{en ? "From the southern coast to forest paths. Choose a city or explore the whole region." : "남쪽 바다부터 숲길까지. 한 지역을 고르거나 경남 전체를 둘러보세요."}</p>
      <GyeongnamRegionPicker value={value} onChange={onChange} includeAll compact />
    </div>
  </div>;
}
