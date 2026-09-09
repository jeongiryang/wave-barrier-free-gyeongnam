import { regionPhotoSource } from "../region-photo-sources";
import { regionShowcaseAlbums } from "../region-showcase-photos";
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

export default function LandingRegionStory({ activeRegion, active, selectRegion }: LandingRegionStoryProps) {
  const { locale, motion, hydrated: ready } = useSitePreferences();
  const stage = useRef<HTMLDivElement>(null);
  const prefetched = useRef(new Set<string>());
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
  // The current album is lazy-rendered below. Warm only the next neighbouring
  // album while the showcase is visible; never fan out across all 18 regions.
  useEffect(() => {
    if (!ready || !inView || !visible || saving) return;
    const index = landingRegions.findIndex(region => region.name === active.name);
    const next = landingRegions[(index + 1) % landingRegions.length].name;
    const images: HTMLImageElement[] = [];
    for (const photo of regionShowcaseAlbums[next]) {
      if (prefetched.current.has(photo.image)) continue;
      const image = new Image();
      image.fetchPriority = "low";
      image.decoding = "async";
      image.onload = () => prefetched.current.add(photo.image);
      image.src = photo.image;
      images.push(image);
    }
    return () => { for (const image of images) { image.onload = null; if (!image.complete) image.src = ""; } };
  }, [ready, inView, visible, saving, active.name]);
  const choose = (region: string) => { setAutomatic(false); selectRegion(region, false); };
  const english = locale === "en";
  const regionLabel = (name: string) => english ? regionNames[name] : name;
  const story = (region: LandingRegion) => english ? englishStories[region.name] : region.story;
  const album = regionShowcaseAlbums[active.name];
  const index = landingRegions.findIndex(region => region.name === active.name);
  const move = (direction: number) => choose(landingRegions[(index + direction + landingRegions.length) % landingRegions.length].name);

  return <section className="region-story region-showcase" id="regions" tabIndex={-1} aria-label={english ? "Gyeongnam photo showcase" : "경남 지역 사진"}
    onPointerEnter={event => { if (event.pointerType === "mouse") setInteracting(true); }} onPointerLeave={() => setInteracting(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <header className="region-showcase-heading">
      <p>{english ? "From the southern coast to the mountains. Find your next place." : <>남쪽 바다에서 깊은 산자락까지.<br />마음이 머무는 곳을 찾아보세요.</>}</p>
    </header>
    <div className="region-showcase-stage" ref={stage} data-cinematic="wide" data-region-stage data-running={running} data-active-region={active.name}>
      <div className="region-photo-album" data-photo-count={album.length}>
        <RegionScenePhoto key={album[0].id} photo={album[0]} name={regionLabel(active.name)} english={english} />
        <div className="region-photo-companions">{album.slice(1).map(photo => <RegionScenePhoto key={photo.id} photo={photo} name={regionLabel(active.name)} english={english} />)}</div>
      </div>
      <div id="region-current" className="region-showcase-caption selected-region" aria-live={running ? "off" : "polite"} aria-atomic="true">
        <small>{english ? "A scene from Gyeongnam" : "지금 만나는 경남"}</small>
        <strong key={active.name}>{regionLabel(active.name)}</strong><p>{story(active)}</p>
      </div>
      <div className="region-showcase-actions">
        <Link href={`/planner?region=${encodeURIComponent(active.name)}`}>{english ? `Plan a trip to ${regionLabel(active.name)}` : `이 지역으로 여행 시작`} <span aria-hidden="true">↗</span></Link>
        <div className="region-arrows" role="group" aria-label={english ? "Browse 18 regions" : "18개 지역 둘러보기"}>
          <button type="button" disabled={!ready} onClick={() => move(-1)} aria-label={english ? "Previous region" : "이전 지역"} aria-controls="region-current"><span aria-hidden="true">←</span></button>
          <button type="button" disabled={!ready} onClick={() => move(1)} aria-label={english ? "Next region" : "다음 지역"} aria-controls="region-current"><span aria-hidden="true">→</span></button>
        </div>
      </div>
      <div key={active.name + String(running)} className="region-showcase-progress" aria-hidden="true" />
    </div>
  </section>;
}

function RegionScenePhoto({ photo, name, english }: { photo: RegionPhoto | null | undefined; name: string; english: boolean }) {
  const [failed, setFailed] = useState(false);
  return <figure className="region-scene-photo">
    {photo?.image && !failed ? <img src={photo.image} alt={`${name} · ${photo.title}`} lang="ko" decoding="async" loading="lazy"
      onError={() => setFailed(true)} ref={node => { if (node?.complete && !node.naturalWidth) setFailed(true); }} />
      : <div className="region-scene-empty" aria-hidden="true"><span>{name}</span></div>}
    <figcaption>{photo ? <><span lang="ko">{photo.title}{photo.photographer && ` · ${photo.photographer}`}</span><br /><a href={regionPhotoSource(photo).href} target="_blank" rel="noopener noreferrer" aria-label={`${photo.title} · ${english ? "original photograph, opens in a new tab" : "사진 원본, 새 탭"}`}>{english ? "Source: ⓒKorea Tourism Organization · original image" : "출처: ⓒ한국관광공사 · 사진 원본"}</a>{failed && <span> · {english ? "Photo unavailable" : "사진을 불러오지 못했어요"}</span>}</> : (english ? "Tourism photo unavailable" : "관광사진을 불러오지 못했어요")}</figcaption>
  </figure>;
}
