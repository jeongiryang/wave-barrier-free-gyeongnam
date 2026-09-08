import LandingBoundaryMap from "./LandingBoundaryMap";
import { useState } from "react";
import Link from "next/link";
import { landingRegions, type LandingRegion, type LandingTranslate, type RegionPhoto } from "../content";
import { useSitePreferences } from "../../../components/SitePreferences";
import { regionNames } from "../../../lib/gyeongnam-region-names";

const englishStories: Record<string, string> = {
  거창: "Suseungdae and mountain village stages", 합천: "Hwangmaesan and film stories", 창녕: "Upo Wetland and riverside flowers", 밀양: "Yeongnamnu Pavilion and Arirang", 양산: "Tongdosa Temple and Cheonseongsan",
  함양: "Jirisan and wild ginseng", 산청: "Donguibogam Village and medicinal herbs", 의령: "Stories of the righteous army", 함안: "Ara Gaya and Nakhwa firework traditions", 김해: "The Gaya capital and Buncheong pottery",
  창원: "Jinhae cherry blossoms and the marine park", 하동: "The Seomjin River and wild tea", 진주: "Lanterns on the Namgang River", 사천: "Aviation by the sea", 고성: "Dinosaur footprints and Danghangpo",
  남해: "Darangyi Village and German Village", 통영: "Hallyeo waterways and Admiral Yi Sun-sin", 거제: "Windy Hill and island flowers",
};

interface LandingRegionStoryProps {
  t: LandingTranslate;
  activeRegion: string;
  active: LandingRegion;
  preview: LandingRegion | null;
  regionPhotos: Record<string, RegionPhoto | null | undefined>;
  showRegionPreview: (region: string, immediate?: boolean) => void;
  hideRegionPreview: (region: string) => void;
  selectRegion: (region: string) => void;
}

export default function LandingRegionStory({ t, activeRegion, active, preview, regionPhotos, showRegionPreview, hideRegionPreview, selectRegion }: LandingRegionStoryProps) {
  const { locale } = useSitePreferences();
  const [overviewFailed, setOverviewFailed] = useState(false);
  const english = locale === "en";
  const regionLabel = (name: string) => english ? regionNames[name] : name;
  const story = (region: LandingRegion) => english ? englishStories[region.name] : region.story;
  const previewPhoto = preview ? regionPhotos[preview.name] : null;
  const activePhoto = regionPhotos[active.name]?.image;

  return <section className="region-story" id="regions">
    <div className="region-story-copy" data-land-reveal>
      <p className="section-kicker">{english ? "18 cities and counties in Gyeongnam" : "경남 18개 시·군"}</p>
      <h2>{english ? "Where in Gyeongnam?" : "경남 어디로 떠나볼까요?"}</h2>
      <p>{english ? "Choose a region, then the facilities you need. Check each place's recorded information before adding it to your trip." : "마음이 가는 지역을 고르세요. 필요한 편의와 장소별 확인 정보를 살펴보고, 내 여행에 담아보세요."}</p>
      <div className="selected-region" role="status" aria-live="polite" aria-atomic="true">
        {activePhoto
          ? <span className="selected-region-photo" style={{ backgroundImage: `url("${activePhoto}")` }} aria-hidden="true" />
          : <span className="selected-region-mark" aria-hidden="true"><i /><b>{regionLabel(active.name).slice(0, 1)}</b></span>}
        <div><small>{t("selected", "지금 선택한 지역")}</small><strong>{regionLabel(active.name)}</strong><p>{story(active)}</p></div>
      </div>
      <Link href={`/planner?region=${encodeURIComponent(active.name)}`}>{english ? `Plan a trip to ${regionLabel(active.name)}` : `${active.name} 여행 만들기`} <b>→</b></Link>
    </div>
    <div className="landing-region-map" data-land-reveal aria-label={english ? "Explore Gyeongnam's 18 regions" : "경상남도 18개 시·군 탐색"}>
      <figure className="region-national-overview">
        {/* Static public boundary illustration; no remote map SDK or key. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {overviewFailed ? <span className="region-national-missing" aria-hidden="true">—</span> : <img src="/maps/korea-sgis-2020.svg" width="120" height="114" loading="lazy" decoding="async" alt={english ? "South Korea with Gyeongnam highlighted in the southeast" : "대한민국 남동부의 경상남도를 강조한 지도"} ref={(node) => { if (node?.complete && !node.naturalWidth) setOverviewFailed(true); }} onError={() => setOverviewFailed(true)} />}
        <figcaption>{english ? "Gyeongnam, southeastern South Korea" : "대한민국 남동쪽, 경상남도"}</figcaption>
      </figure>
      <div className="landing-region-map-scroll">
        <LandingBoundaryMap selected={activeRegion} preview={preview?.name || null} english={english} onSelect={selectRegion} onPreview={showRegionPreview} onLeave={hideRegionPreview} />
        <div className="landing-region-map-canvas region-boundary-list" data-region-map-canvas data-locale={locale} role="group" aria-label={english ? "List of Gyeongnam's 18 regions" : "경남 18개 지역 목록"}>
          {landingRegions.map((region, index) => <button
            key={region.name}
            type="button"
            className={activeRegion === region.name ? "active" : ""}
            data-region-index={index}
            data-region-marker={region.name}
            onClick={() => selectRegion(region.name)}
            onPointerEnter={() => showRegionPreview(region.name)}
            onPointerLeave={() => hideRegionPreview(region.name)}
            onFocus={() => showRegionPreview(region.name, true)}
            onBlur={() => hideRegionPreview(region.name)}
            aria-label={regionLabel(region.name)}
            aria-pressed={activeRegion === region.name}
          ><span className="region-marker-dot" aria-hidden="true"><i /></span><b>{regionLabel(region.name)}</b></button>)}
          {preview && <div className={`region-photo-preview${previewPhoto === undefined ? " loading" : ""}`}>
            {previewPhoto?.image
              ? <div style={{ backgroundImage: `linear-gradient(180deg,transparent 32%,rgba(3,24,41,.78)),url("${previewPhoto.image}")` }} />
              : previewPhoto === undefined
                ? <div className="region-photo-skeleton"><i /><i /></div>
                : <div className="region-photo-placeholder"><span className="region-photo-placeholder-mark" aria-hidden="true"><i /><b>{regionLabel(preview.name).slice(0, 1)}</b></span><small>{english ? "Story" : "지역 이야기"}</small><strong>{regionLabel(preview.name)}</strong></div>}
            <section className={previewPhoto === undefined ? "loading-copy" : ""}><small lang={previewPhoto?.location ? "ko" : locale}>{previewPhoto?.location || (english ? "Gyeongnam tourism photos" : "경상남도 관광사진")}</small><strong lang={previewPhoto?.title ? "ko" : locale}>{previewPhoto?.title || (english ? `${regionLabel(preview.name)} travel stories` : `${preview.name}의 여행 이야기`)}</strong><span>{previewPhoto === undefined ? (english ? "Loading official tourism photos" : "공식 관광사진 불러오는 중") : story(preview)}</span>{english && previewPhoto && <small>Photo titles and locations are provided in their original Korean.</small>}</section>
          </div>}
        </div>
      </div>

      <p className="region-map-note">{english ? "SGIS 2020 · simplified boundaries / StatGarten. For choosing a region, not navigation." : "통계청 SGIS 2020 · 경계 단순화 / StatGarten. 지역 선택을 위한 지도이며 길 안내에 사용하지 마세요."} <a href="https://github.com/statgarten/maps/tree/d5f8ea3208f19a73a01f865847d20cc195ae91ba">{english ? "Map source" : "지도 출처"}</a></p>
    </div>
  </section>;
}
