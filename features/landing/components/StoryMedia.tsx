"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";

function dataConnection() {
  return (navigator as Navigator & { connection?: EventTarget & { readonly saveData?: boolean } }).connection;
}

/** Static first: video bytes are requested only by an explicit play action. */
export default function StoryMedia({ children, kind = "hero" }: { children: ReactNode; kind?: "hero" | "film" }) {
  const { locale, motion } = useSitePreferences();
  const en = locale === "en";
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [saveData, setSaveData] = useState(false);

  useEffect(() => {
    const player = video.current;
    if (!player) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = dataConnection();
    const pause = () => player.pause();
    const preferenceChanged = () => {
      const reduced = media.matches || motion === "calm";
      setReducedMotion(reduced);
      if (reduced) pause();
    };
    const visibilityChanged = () => { if (document.hidden) pause(); };
    const connectionChanged = () => {
      const saving = connection?.saveData === true;
      setSaveData(saving);
      if (saving) {
        pause();
        setPlaying(false);
        // Stop an in-flight decorative download as well as playback.
        if (player.hasAttribute("src")) { player.removeAttribute("src"); player.load(); }
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) pause();
    });
    observer.observe(player);
    preferenceChanged();
    connectionChanged();
    media.addEventListener("change", preferenceChanged);
    connection?.addEventListener("change", connectionChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", preferenceChanged);
      connection?.removeEventListener("change", connectionChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
      pause();
    };
  }, [motion]);

  function togglePlayback() {
    const player = video.current;
    if (!player || failed || dataConnection()?.saveData || motion === "calm" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!player.paused) { player.pause(); return; }
    if (!player.getAttribute("src")) player.src = kind === "film" ? "/media/wave-story/story-film-v2.mp4" : "/media/wave-story/hero-water-loop.mp4";
    void player.play().catch((error: unknown) => {
      // A pause while playback starts is expected when the preference or viewport changes.
      if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
    });
  }

  return <figure className={`story-media${kind === "film" ? " story-film" : ""}`} aria-label={en ? "An imagined coastal journey" : "바닷가 여행을 담은 상상 풍경"}>
    {!imageFailed && <img src={kind === "film" ? "/media/wave-story/garden-discovery-v2.webp" : "/media/wave-story/hero-coast-small.webp"} srcSet={kind === "hero" ? "/media/wave-story/hero-coast-small.webp 840w, /media/wave-story/hero-coast.webp 1672w" : undefined} sizes="100vw" width={kind === "film" ? 1448 : 1672} height={kind === "film" ? 1086 : 941} loading={kind === "film" ? "lazy" : undefined} fetchPriority={kind === "hero" ? "high" : "auto"} alt="" onError={() => setImageFailed(true)} />}
    <video ref={video} muted playsInline loop={kind === "hero"} preload="none" aria-hidden="true" tabIndex={-1} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => { setPlaying(false); setFailed(true); }} data-playing={playing && !failed} />
    {children}
    <figcaption>
      <span>{en ? "Imagined scenery · not a real destination or facility record" : "상상 풍경 · 실제 관광지나 편의시설 정보가 아닙니다"}</span>
      <button type="button" onClick={togglePlayback} aria-pressed={playing} aria-disabled={failed || reducedMotion || saveData}>
        {kind === "film" ? (playing ? (en ? "Pause story film" : "소개 영상 일시정지") : (en ? "Play the 20-second story" : "20초 소개 영상 보기")) : playing ? (en ? "Pause scenery" : "풍경 일시정지") : (en ? "Play scenery" : "풍경 재생")}
      </button>
      <span role="status">{failed ? (en ? "The video is unavailable. You can continue planning below." : "영상을 불러오지 못했어요. 아래에서 여행 계획을 계속할 수 있어요.") : saveData ? (en ? "Data saving is on. The video is not loaded." : "데이터 절약 설정에 따라 영상은 불러오지 않아요.") : reducedMotion ? (en ? "Reduced motion is on. The scenery stays still." : "동작 줄이기 설정에 따라 정지된 풍경을 보여드려요.") : ""}</span>
    </figcaption>
  </figure>;
}
