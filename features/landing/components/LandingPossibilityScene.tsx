"use client";
import { useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import { regionShowcaseAlbums } from "../region-showcase-photos";
import { regionPhotoSource } from "../region-photo-sources";
import LandingScreenCapture from "./LandingScreenCapture";

export default function LandingPossibilityScene() {
  const en = useSitePreferences().locale === "en";
  const photo = regionShowcaseAlbums["창원"].find(photo => photo.id === "2758443")!;
  const [failed, setFailed] = useState(false);
  return <section id="recommendation" tabIndex={-1} className="recommendation-chapter" aria-labelledby="recommendation-title" data-cinematic="left">
    <figure className="destination-panorama">
      {!failed && <img src={photo.image} alt={photo.title} loading="lazy" decoding="async" onError={() => setFailed(true)} />}
      <figcaption><a href={regionPhotoSource(photo).href} target="_blank" rel="noopener noreferrer">{photo.title} · {en ? "Source: ⓒKorea Tourism Organization" : "출처: ⓒ한국관광공사"}</a></figcaption>
    </figure>
    <div className="destination-editorial">
      <div className="destination-copy">
        <p className="section-kicker">{en ? "Places that fit your plans" : "내 조건에서 만나는 여행지"}</p>
        <h2 id="recommendation-title">{en ? "A place to fall for." : "마음에 드는 풍경,"}<br /><em>{en ? "The details to decide." : "나에게 맞는 이유."}</em></h2>
        <p>{en ? "Find the scenery you love, with the facilities you need." : "마음이 가는 풍경에, 내게 필요한 편의까지."}</p>
        <dl className="destination-evidence" data-place-evidence="2758443">
          <div><dt>{en ? "Daesan Flower Land · recorded" : "대산플라워랜드 · 확인"}</dt><dd>{en ? "Access path · toilet" : "완만한 접근로 · 화장실"}</dd></div>
          <div><dt>{en ? "Unconfirmed" : "미확인"}</dt><dd>{en ? "Lift · ask the venue" : "승강기 · 방문 전 시설에 문의"}</dd></div>
        </dl>
      </div>
      <figure className="destination-product">
        <LandingScreenCapture name="places-two" width={833} height={546} alt="주남저수지와 대산플라워랜드의 실제 관광사진과 편의정보. 한국관광공사 사진 워터마크 유지." />
        <figcaption>{en ? "Photos and facility records: ⓒKorea Tourism Organization" : "사진·편의정보 출처: ⓒ한국관광공사"}</figcaption>
      </figure>
    </div>
  </section>;
}
