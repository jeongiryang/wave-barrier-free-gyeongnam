import { regionPhotoSource } from "../region-photo-sources";
import { regionShowcaseAlbums } from "../region-showcase-photos";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { landingRegions, type LandingRegion, type LandingTranslate, type RegionPhoto } from "../content";
import { useSitePreferences } from "../../../components/SitePreferences";
import { regionNames } from "../../../lib/gyeongnam-region-names";

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
  const rotationControl = useRef<HTMLButtonElement>(null);
  const prefetched = useRef(new Set<string>());
  const [photoChoice, setPhotoChoice] = useState<{ region: string; index: number } | null>(null);
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
    for (const photo of [...regionShowcaseAlbums[active.name], ...regionShowcaseAlbums[next]]) {
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
  const choose = (region: string) => { setAutomatic(false); setPhotoChoice(null); selectRegion(region, false); };
  const english = locale === "en";
  const regionLabel = (name: string) => english ? regionNames[name] : name;
  const album = regionShowcaseAlbums[active.name];
  const photoIndex = photoChoice?.region === active.name ? photoChoice.index : 0;
  const photo = album[photoIndex] || album[0];
  const index = landingRegions.findIndex(region => region.name === active.name);
  const move = (direction: number) => choose(landingRegions[(index + direction + landingRegions.length) % landingRegions.length].name);
  const rotationLabel = automatic
    ? (english ? "Pause automatic region changes" : "지역 자동 전환 일시정지")
    : (english ? "Resume automatic region changes" : "지역 자동 전환 재개");

  return <section className="region-story region-showcase" id="regions" tabIndex={-1} aria-label={english ? "Gyeongnam photo showcase" : "경남 지역 사진"}
    onPointerEnter={event => { if (event.pointerType === "mouse") setInteracting(true); }} onPointerLeave={() => setInteracting(false)}
    onFocusCapture={event => setFocused(event.target !== rotationControl.current)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className="region-showcase-stage" ref={stage} data-cinematic="wide" data-region-stage data-running={running} data-active-region={active.name}>
      <div id="region-photograph" className="region-photo-album" data-photo-count={album.length} data-photo-index={photoIndex}>
        <RegionScenePhoto key={photo.id} photo={photo} name={regionLabel(active.name)} english={english} />
      </div>
      <div id="region-current" className="region-showcase-caption selected-region" aria-live={running ? "off" : "polite"} aria-atomic="true">
        <small>{english ? "A scene from Gyeongnam" : "지금 만나는 경남"}</small>
        <strong key={active.name}>{regionLabel(active.name)}</strong><p lang="ko">{photo.title}</p>
      </div>
      <div className="region-showcase-actions">
        <Link href={`/planner?region=${encodeURIComponent(active.name)}`}>{english ? `Plan a trip to ${regionLabel(active.name)}` : `이 지역으로 여행 시작`} <span aria-hidden="true">↗</span></Link>
        <div className="region-arrows" role="group" aria-label={english ? "Browse 18 regions" : "18개 지역 둘러보기"}>
          <button ref={rotationControl} type="button" disabled={!ready || motion === "calm"} onClick={() => setAutomatic(value => !value)} aria-label={rotationLabel} aria-pressed={!automatic} aria-controls="region-current"><span aria-hidden="true">{automatic ? "Ⅱ" : "▶"}</span></button>
          <button type="button" disabled={!ready} onClick={() => move(-1)} aria-label={english ? "Previous region" : "이전 지역"} aria-controls="region-current"><span aria-hidden="true">←</span></button>
          <button type="button" disabled={!ready} onClick={() => move(1)} aria-label={english ? "Next region" : "다음 지역"} aria-controls="region-current"><span aria-hidden="true">→</span></button>
        </div>
      </div>
      <div className="region-photo-selector" role="group" aria-label={`${regionLabel(active.name)} ${english ? "photographs" : "사진 선택"}`}>
        {album.map((item, index) => <button key={item.id} type="button" aria-label={`${item.title} · ${english ? "show photograph" : "사진 보기"}`} title={item.title} aria-pressed={index === photoIndex} aria-controls="region-photograph" onClick={() => { setAutomatic(false); setPhotoChoice({ region: active.name, index }); }}><span aria-hidden="true" /></button>)}
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
