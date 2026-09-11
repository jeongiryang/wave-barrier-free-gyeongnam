import { regionPhotoSource } from "../region-photo-sources";
import { regionShowcaseAlbums } from "../region-showcase-photos";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { landingRegions, type LandingRegion, type LandingTranslate, type RegionPhoto } from "../content";
import { useSitePreferences } from "../../../components/SitePreferences";
import { regionNames } from "../../../lib/gyeongnam-region-names";
import { useRegionFilm } from "../hooks/useRegionFilm";

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
  const rail = useRef<HTMLDivElement>(null);
  const counterRail = useRef<HTMLDivElement>(null);
  const film = useRegionFilm(rail, counterRail, motion === "calm");
  const pointerRotationIntent = useRef<boolean | null>(null);
  const prefetched = useRef(new Set<string>());
  const [photoChoice, setPhotoChoice] = useState<{ region: string; index: number } | null>(null);
  const [inView, setInView] = useState(false);
  const [gallerySeen, setGallerySeen] = useState(false);
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
    const observer = new IntersectionObserver(([entry]) => { setInView(entry.isIntersecting); if (entry.isIntersecting) setGallerySeen(true); }, { threshold: .25 });
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
  const previousRegion = useRef(active.name);
  useEffect(() => {
    if (previousRegion.current === active.name) return;
    previousRegion.current = active.name;
    const card = stage.current?.querySelector<HTMLElement>(".region-featured-card");
    const row = card?.closest<HTMLElement>(".region-card-rail");
    if (card && row) row.scrollTo({ left: row.scrollLeft + card.getBoundingClientRect().left - row.getBoundingClientRect().left - 16, behavior: "instant" });
  }, [active.name]);
  const rotationLabel = automatic
    ? (english ? "Pause automatic region changes" : "지역 자동 전환 일시정지")
    : (english ? "Resume automatic region changes" : "지역 자동 전환 재개");

  return <section ref={film} className="region-story region-showcase" id="regions" tabIndex={-1} aria-label={english ? "Gyeongnam photo showcase" : "경남 지역 사진"}
    onPointerEnter={event => { if (event.pointerType === "mouse") setAutomatic(false); }}
    onFocusCapture={() => setAutomatic(false)}>
    <div className="region-showcase-stage" ref={stage} data-in-view={inView} data-region-stage data-running={running} data-active-region={active.name}>
      <header className="region-gallery-heading"><div><p className="horizon-eyebrow">{english ? "SCENES OF GYEONGNAM" : "풍경으로 만나는 경남"}</p><h2>{english ? "Where will your day begin?" : <>마음이 향하는 곳에,<br />당신의 하루를.</>}</h2></div><p>{english ? "Find your next scene across 18 regions." : <>바다를 따라 걷고, 정원에서 쉬어가고.<br />18개 지역에서 다음 풍경을 만나보세요.</>}</p></header>
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
      <div className="region-film-rows">
      {[landingRegions.slice(0, 9), landingRegions.slice(9)].map((regions, rowIndex) => <div key={rowIndex} className="region-card-rail" ref={rowIndex === 0 ? rail : counterRail} data-film-direction={rowIndex === 0 ? "right" : "left"} aria-label={english ? `Regional landscapes, row ${rowIndex + 1}` : `지역 풍경 카드 ${rowIndex + 1}번째 줄`}>
      {regions.map(region => {
        const featured = region.name === active.name;
        const scene = featured ? photo : regionShowcaseAlbums[region.name][0];
        return <article key={region.name} className={`region-landscape-card ${featured ? "region-featured-card" : "region-neighbour-card"}`}>
          {featured ? <div id="region-photograph" className="region-photo-album" data-photo-count={album.length} data-photo-index={photoIndex}><RegionScenePhoto key={scene.id} photo={scene} name={regionLabel(region.name)} english={english} /></div>
            : <RegionScenePhoto key={scene.id} photo={scene} name={regionLabel(region.name)} english={english} creditId={`region-neighbour-${region.name}`} load={gallerySeen && !saving} />}
          <div id={featured ? "region-current" : undefined} className={featured ? "region-showcase-caption selected-region" : "region-neighbour-copy"} aria-live={featured && !running ? "polite" : "off"} aria-atomic={featured ? "true" : undefined}>
            <small>{regionLabel(region.name)}</small>
            {featured ? <><strong key={active.name} tabIndex={-1} lang="ko">{scene.title}</strong><p>{english ? "A landscape for your kind of day." : "마음이 머무는 풍경, 우리의 속도로."}</p></> : <><h3 lang="ko">{scene.title}</h3><button type="button" onClick={() => { choose(region.name); requestAnimationFrame(() => stage.current?.querySelector<HTMLElement>(".selected-region strong")?.focus({ preventScroll: true })); }}>{english ? `Explore ${regionLabel(region.name)}` : `${region.name} 풍경 살펴보기`} <span aria-hidden="true">↗</span></button></>}
          </div>
          {featured && <>
            <Link className="region-card-start" href={`/planner?region=${encodeURIComponent(active.name)}`} aria-label={`${regionLabel(active.name)} 여행 설계`}><span aria-hidden="true">↗</span></Link>
            <div className="region-photo-selector" role="group" aria-label={`${regionLabel(active.name)} ${english ? "photographs" : "사진 선택"}`}>
              {album.map((item, index) => <button key={item.id} type="button" lang="ko" aria-labelledby={`region-photo-${index}-name region-photo-${index}-action`} title={item.title} aria-pressed={index === photoIndex} aria-controls="region-photograph" onClick={() => { setAutomatic(false); setPhotoChoice({ region: active.name, index }); }}><span aria-hidden="true" /><b><span className="sr-only" id={`region-photo-${index}-name`} lang="ko">{item.title}</span><span className="sr-only" id={`region-photo-${index}-action`} lang={locale}> · {english ? "show photograph" : "사진 보기"}</span></b></button>)}
            </div>
            <div key={active.name + photoIndex + String(running)} className="region-showcase-progress" aria-hidden="true" />
          </>}
        </article>;
      })}
      </div>)}
      </div>
    </div>
  </section>;
}

function RegionScenePhoto({ photo, name, english, creditId = "region-photo-credit", load = true }: { photo: RegionPhoto | null | undefined; name: string; english: boolean; creditId?: string; load?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <figure className="region-scene-photo">
    {load && photo?.image && !failed ? <img src={photo.image} alt={photo.title} lang="ko" decoding="async" loading="lazy"
      onError={() => setFailed(true)} ref={node => { if (node?.complete && !node.naturalWidth) setFailed(true); }} />
      : <div className="region-scene-empty" aria-hidden="true"><span>{name}</span></div>}
    <figcaption>{photo ? <><span lang="ko"><span id={`${creditId}-name`} className="sr-only">{photo.title}</span>{photo.photographer || "한국관광공사"}</span><span> · ⓒ한국관광공사 · </span><a href={regionPhotoSource(photo).href} target="_blank" rel="noopener noreferrer" aria-labelledby={`${creditId}-name ${creditId}-action`}><span id={`${creditId}-action`} className="sr-only"> · {english ? "original photograph, opens in a new tab" : "사진 원본, 새 탭"}</span><span aria-hidden="true">{english ? "Original photograph" : "사진 원본"}</span></a>{failed && <span> · {english ? "Photo unavailable" : "사진을 불러오지 못했어요"}</span>}</> : (english ? "Tourism photo unavailable" : "관광사진을 불러오지 못했어요")}</figcaption>
  </figure>;
}
