import { regionShowcasePhotos } from "../region-showcase-photos";
import LandingBoundaryMap from "./LandingBoundaryMap";
import { useEffect, useRef, useState } from "react";
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
  selectRegion: (region: string, loadPhoto?: boolean) => void;
}

export default function LandingRegionStory({ activeRegion, active, preview, regionPhotos, showRegionPreview, hideRegionPreview, selectRegion }: LandingRegionStoryProps) {
  const { locale, motion, hydrated: ready } = useSitePreferences();
  const stage = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [automatic, setAutomatic] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const running = ready && automatic && inView && visible && !interacting && !focused && !saving && motion !== "calm";
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const sync = () => { setVisible(!document.hidden); setSaving(connection?.saveData === true); };
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .25 });
    if (stage.current) observer.observe(stage.current);
    sync();
    document.addEventListener("visibilitychange", sync);
    connection?.addEventListener("change", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); connection?.removeEventListener("change", sync); };
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      const index = landingRegions.findIndex(region => region.name === activeRegion);
      selectRegion(landingRegions[(index + 1) % landingRegions.length].name, false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [running, activeRegion, selectRegion]);
  const choose = (region: string) => { setAutomatic(false); selectRegion(region, false); };
  const [overviewFailed, setOverviewFailed] = useState(false);
  const english = locale === "en";
  const regionLabel = (name: string) => english ? regionNames[name] : name;
  const story = (region: LandingRegion) => english ? englishStories[region.name] : region.story;
  const previewPhoto = preview ? regionPhotos[preview.name] : null;
  const activePhoto = regionShowcasePhotos[active.name];

  return <section className="region-story region-showcase" id="regions" data-cinematic="wide"
    onPointerEnter={event => { if (event.pointerType === "mouse") setInteracting(true); }} onPointerLeave={() => setInteracting(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <header className="region-showcase-heading">
      <p className="section-kicker">{english ? "18 different journeys" : "열여덟 빛깔의 경남"}</p>
      <h2>{english ? "A different scene.\nA journey of your own." : "지역마다 다른 풍경,\n나만의 여행 한 장면."}</h2>
      <p>{english ? "From the southern coast to the mountains. Find your next place." : "남쪽 바다에서 깊은 산자락까지. 마음이 머무는 곳을 찾아보세요."}</p>
    </header>
    <div className="region-showcase-stage" ref={stage} data-region-stage data-running={running} data-active-region={active.name}>
      <RegionScenePhoto key={active.name} photo={activePhoto} name={regionLabel(active.name)} english={english} />
      <div className="region-showcase-counter" aria-hidden="true"><b>{String(landingRegions.findIndex(region => region.name === active.name) + 1).padStart(2, "0")}</b><span>/ 18</span></div>
      <div className="region-showcase-caption selected-region" aria-live={running ? "off" : "polite"} aria-atomic="true">
        <small>{english ? "A scene from Gyeongnam" : "지금 만나는 경남"}</small>
        <strong key={active.name}>{regionLabel(active.name)}</strong><p>{story(active)}</p>
      </div>
      <div className="region-showcase-actions">
        <Link href={`/planner?region=${encodeURIComponent(active.name)}`}>{english ? `Plan a trip to ${regionLabel(active.name)}` : `${active.name} 여행 만들기`} <span aria-hidden="true">↗</span></Link>
        <button type="button" onClick={() => setAutomatic(value => !value)} aria-pressed={!automatic}
          aria-disabled={!ready || motion === "calm" || saving} disabled={!ready || motion === "calm" || saving}>
          {motion === "calm" || saving ? (english ? "Manual selection" : "직접 골라보기") : automatic ? (english ? "Pause region rotation" : "지역 자동 넘김 정지") : (english ? "Resume region rotation" : "지역 자동 넘김 재생")}
        </button>
      </div>
      <div key={active.name + String(running)} className="region-showcase-progress" aria-hidden="true" />
    </div>
    <div className="region-showcase-selection" role="group" aria-label={english ? "Choose a region" : "쇼케이스 지역 선택"}>
      {landingRegions.map(region => <button key={region.name} type="button" disabled={!ready} aria-pressed={activeRegion === region.name} onClick={() => choose(region.name)}>{regionLabel(region.name)}</button>)}
    </div>
    <details className="region-map-details"><summary>{english ? "Find all 18 regions on the map" : "18개 지역, 지도에서 위치 보기"}</summary>
    <div className="landing-region-map" aria-label={english ? "Explore Gyeongnam's 18 regions" : "경상남도 18개 시·군 탐색"}>
      <figure className="region-national-overview">
        {/* Static public boundary illustration; no remote map SDK or key. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {overviewFailed ? <span className="region-national-missing" aria-hidden="true">—</span> : <img src="/maps/korea-sgis-2020.svg" width="120" height="114" loading="lazy" decoding="async" alt={english ? "South Korea with Gyeongnam highlighted in the southeast" : "대한민국 남동부의 경상남도를 강조한 지도"} ref={(node) => { if (node?.complete && !node.naturalWidth) setOverviewFailed(true); }} onError={() => setOverviewFailed(true)} />}
        <figcaption>{english ? "Gyeongnam, southeastern South Korea" : "대한민국 남동쪽, 경상남도"}</figcaption>
      </figure>
      <div className="landing-region-map-scroll">
        <LandingBoundaryMap selected={activeRegion} preview={preview?.name || null} english={english} onSelect={choose} onPreview={showRegionPreview} onLeave={hideRegionPreview} />
        <div className="landing-region-map-canvas region-boundary-list" data-region-map-canvas data-locale={locale} role="group" aria-label={english ? "List of Gyeongnam's 18 regions" : "경남 18개 지역 목록"}>
          {landingRegions.map((region, index) => <button
            key={region.name}
            type="button"
            className={activeRegion === region.name ? "active" : ""}
            data-region-index={index}
            data-region-marker={region.name}
            onClick={() => choose(region.name)}
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
    </details>
  </section>;
}

function RegionScenePhoto({ photo, name, english }: { photo: RegionPhoto | null | undefined; name: string; english: boolean }) {
  const [failed, setFailed] = useState(false);
  return <figure className="region-scene-photo">
    {photo?.image && !failed ? <img src={photo.image} alt={`${name} · ${photo.title}`} lang="ko" decoding="async" loading="lazy"
      onError={() => setFailed(true)} ref={node => { if (node?.complete && !node.naturalWidth) setFailed(true); }} />
      : <div className="region-scene-empty" aria-hidden="true"><span>{name}</span></div>}
    <figcaption>{photo?.image && !failed
      ? <><span lang="ko">{photo.title}</span> · {english ? "Photo selection, Sep 2026 · Source: ⓒKorea Tourism Organization" : "2026.09 선정 관광사진 · 출처: ⓒ한국관광공사"}{photo.photographer ? ` · ${photo.photographer}` : ""}</>
      : photo === undefined ? (english ? "Loading official tourism photography" : "공식 관광사진을 불러오고 있어요") : (english ? "Tourism photo unavailable · explore the regional story" : "관광사진을 불러오지 못했어요 · 지역 이야기로 살펴보세요")}</figcaption>
  </figure>;
}
