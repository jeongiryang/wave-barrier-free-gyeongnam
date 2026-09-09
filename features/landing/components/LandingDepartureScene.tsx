"use client";

import { useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import { regionShowcasePhotos } from "../region-showcase-photos";

/** An editorial destination photo, not a claim about today's facilities or weather. */
export default function LandingDepartureScene() {
  const en = useSitePreferences().locale === "en";
  const [failed, setFailed] = useState(false);
  const photo = regionShowcasePhotos["남해"];
  return <section className="departure-scene" data-cinematic="curtain" aria-labelledby="departure-scene-title">
    <div className="departure-scene-image" aria-hidden="true">
      {!failed && <img src={photo.image} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />}
    </div>
    <div className="departure-scene-copy">
      <p className="section-kicker">{en ? "Before the journey begins" : "여행이 시작되기 바로 전"}</p>
      <h2 id="departure-scene-title">{en ? "One more look." : "설레는 마음에,"}<br />{en ? "A little less uncertainty." : "확신을 더하는 시간."}</h2>
      <p>{en ? "Weather, journeys and the facilities you need. Recheck what can change before you leave." : "날씨와 이동, 내게 필요한 편의까지. 달라질 수 있는 정보를 출발 전에 한 번 더 살펴보세요."}</p>
      <ul aria-label={en ? "What to recheck" : "출발 전 다시 살펴볼 정보"}>
        <li>{en ? "The day's weather" : "그날의 날씨"}</li><li>{en ? "Every journey" : "장소 사이 이동"}</li><li>{en ? "Needed facilities" : "필요한 편의"}</li>
      </ul>
      <a href="/planner">{en ? "Prepare my journey" : "내 여행 준비하기"} <span aria-hidden="true">↗</span></a>
    </div>
    <p className="departure-scene-credit">{failed ? (en ? "Photo unavailable" : "사진을 불러오지 못했어요") : <span lang="ko">남해 다랭이마을 · {photo.photographer}</span>} · {en ? "Source: ⓒKorea Tourism Organization · selected Sep 2026" : "출처: ⓒ한국관광공사 · 2026.09 선정 관광사진"}</p>
  </section>;
}
