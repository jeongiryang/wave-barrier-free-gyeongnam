"use client";
import { useState } from "react";
import { regionShowcasePhotos } from "../region-showcase-photos";
import { useSitePreferences } from "../../../components/SitePreferences";

/** A full-width frame is progressively uncovered, not an image zoom inside a card. */
export default function LandingExpansionScene() {
  const en = useSitePreferences().locale === "en";
  const photo = regionShowcasePhotos["창녕"];
  const [failed, setFailed] = useState(false);
  return <div className="story-expansion" data-cinematic="center">
    <figure className="story-expansion-frame">
      {!failed && <img src={photo.image} width="1600" height="1067" loading="lazy" decoding="async" alt={`${photo.title} · ${photo.location}`} lang="ko" onError={() => setFailed(true)} />}
      <figcaption>{photo.title} · {en ? "Source: ⓒKorea Tourism Organization" : "출처: ⓒ한국관광공사"} · {photo.photographer}</figcaption>
    </figure>
    <div className="story-expansion-copy">
      <p>{en ? "More room for your journey" : "여행의 가능성을 넓히다"}</p>
      <h2 id="story-expansion-title">{en ? "Less uncertainty." : "걱정은 덜고,"}<br />{en ? "More to discover." : "설렘은 더 멀리."}</h2>
    </div>
  </div>;
}
