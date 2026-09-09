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
  const pointerRotationIntent = useRef<boolean | null>(null);
  const prefetched = useRef(new Set<string>());
  const [photoChoice, setPhotoChoice] = useState<{ region: string; index: number } | null>(null);
  const [inView, setInView] = useState(false);
  const [automatic, setAutomatic] = useState(true);
  const [visible, setVisible] = useState(true);
  const [saving, setSaving] = useState(false);
  const album = regionShowcaseAlbums[active.name];
  const photoIndex = photoChoice?.region === active.name ? photoChoice.index : 0;
  const running = ready && automatic && inView && visible && !saving && motion !== "calm";
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const reduction = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setVisible(!document.hidden);
      setSaving(connection?.saveData === true);
      if (reduction.matches || connection?.saveData === true) setAutomatic(false);
    };
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .25 });
    if (stage.current) observer.observe(stage.current);
    sync();
    document.addEventListener("visibilitychange", sync);
    connection?.addEventListener("change", sync);
    reduction.addEventListener("change", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); connection?.removeEventListener("change", sync); reduction.removeEventListener("change", sync); };
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      if (photoIndex + 1 < album.length) {
        setPhotoChoice({ region: active.name, index: photoIndex + 1 });
        return;
      }
      const index = landingRegions.findIndex(region => region.name === activeRegion);
      setPhotoChoice(null);
      selectRegion(landingRegions[(index + 1) % landingRegions.length].name, false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [running, activeRegion, active.name, album.length, photoIndex, selectRegion]);
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
  const photo = album[photoIndex] || album[0];
  const index = landingRegions.findIndex(region => region.name === active.name);
  const move = (direction: number) => choose(landingRegions[(index + direction + landingRegions.length) % landingRegions.length].name);
  const rotationLabel = automatic
    ? (english ? "Pause automatic region changes" : "지역 자동 전환 일시정지")
    : (english ? "Resume automatic region changes" : "지역 자동 전환 재개");

  return <section className="region-story region-showcase" id="regions" tabIndex={-1} aria-label={english ? "Gyeongnam photo showcase" : "경남 지역 사진"}
    onPointerEnter={event => { if (event.pointerType === "mouse") setAutomatic(false); }}
    onFocusCapture={() => setAutomatic(false)}>
    <div className="region-showcase-stage" ref={stage} data-cinematic="wide" data-region-stage data-running={running} data-active-region={active.name}>
      <div className="region-showcase-actions">
        <div className="region-arrows" role="group" aria-label={english ? "Browse 18 regions" : "18개 지역 둘러보기"}>
          <button className="region-rotation-control" type="button" disabled={!ready || motion === "calm" || saving}
            onPointerDown={() => { pointerRotationIntent.current = !automatic; }}
            onPointerCancel={() => { pointerRotationIntent.current = null; }}
            onClick={event => {
              // Touch can focus the control before click. Keep the action the
              // user pressed, even when focus has already paused the scene.
              const intent = event.detail ? pointerRotationIntent.current : null;
              pointerRotationIntent.current = null;
              setAutomatic(value => intent ?? !value);
            }} aria-label={rotationLabel} title={rotationLabel} aria-controls="region-current"><span aria-hidden="true">{automatic ? "Ⅱ" : "▶"}</span></button>
          <button type="button" disabled={!ready} onClick={() => move(-1)} aria-label={english ? "Previous region" : "이전 지역"} aria-controls="region-current"><span aria-hidden="true">←</span></button>
          <button type="button" disabled={!ready} onClick={() => move(1)} aria-label={english ? "Next region" : "다음 지역"} aria-controls="region-current"><span aria-hidden="true">→</span></button>
        </div>
        <Link href={`/planner?region=${encodeURIComponent(active.name)}`}>{english ? `Plan a trip to ${regionLabel(active.name)}` : `이 지역으로 여행 시작`} <span aria-hidden="true">↗</span></Link>
      </div>
      <div id="region-photograph" className="region-photo-album" data-photo-count={album.length} data-photo-index={photoIndex}>
        <RegionScenePhoto key={photo.id} photo={photo} name={regionLabel(active.name)} english={english} />
      </div>
      <div id="region-current" className="region-showcase-caption selected-region" aria-live={running ? "off" : "polite"} aria-atomic="true">
        <small>{english ? "A scene from Gyeongnam" : "지금 만나는 경남"}</small>
        <strong key={active.name}>{regionLabel(active.name)}</strong><p lang="ko">{photo.title}</p>
      </div>
      <div className="region-photo-selector" role="group" aria-label={`${regionLabel(active.name)} ${english ? "photographs" : "사진 선택"}`}>
        {album.map((item, index) => <button key={item.id} type="button" lang="ko" aria-labelledby={`region-photo-${index}-name region-photo-${index}-action`} title={item.title} aria-pressed={index === photoIndex} aria-controls="region-photograph" onClick={() => { setAutomatic(false); setPhotoChoice({ region: active.name, index }); }}><span aria-hidden="true" /><b className="sr-only"><span id={`region-photo-${index}-name`} lang="ko">{item.title}</span><span id={`region-photo-${index}-action`} lang={locale}> · {english ? "show photograph" : "사진 보기"}</span></b></button>)}
      </div>
      <div key={active.name + photoIndex + String(running)} className="region-showcase-progress" aria-hidden="true" />
    </div>
  </section>;
}

function RegionScenePhoto({ photo, name, english }: { photo: RegionPhoto | null | undefined; name: string; english: boolean }) {
  const [failed, setFailed] = useState(false);
  return <figure className="region-scene-photo">
    {photo?.image && !failed ? <img src={photo.image} alt={photo.title} lang="ko" decoding="async" loading="lazy"
      onError={() => setFailed(true)} ref={node => { if (node?.complete && !node.naturalWidth) setFailed(true); }} />
      : <div className="region-scene-empty" aria-hidden="true"><span>{name}</span></div>}
    <figcaption>{photo ? <><span lang="ko"><span id="region-photo-credit-name">{photo.title}</span>{photo.photographer && ` · ${photo.photographer}`}</span><br /><span>{english ? "Source: ⓒKorea Tourism Organization · " : "출처: ⓒ한국관광공사 · "}</span><a href={regionPhotoSource(photo).href} target="_blank" rel="noopener noreferrer" aria-labelledby="region-photo-credit-name region-photo-credit-action"><span id="region-photo-credit-action" className="sr-only"> · {english ? "original photograph, opens in a new tab" : "사진 원본, 새 탭"}</span><span aria-hidden="true">{english ? "Original photograph" : "사진 원본"}</span></a>{failed && <span> · {english ? "Photo unavailable" : "사진을 불러오지 못했어요"}</span>}</> : (english ? "Tourism photo unavailable" : "관광사진을 불러오지 못했어요")}</figcaption>
  </figure>;
}
