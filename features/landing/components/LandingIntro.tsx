"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import WaveField from "../../../components/WaveField";

const SESSION_KEY = "wave-arrival-session-v1";
const VIDEO = "/media/wave-story/hero-water-loop.mp4";

/** Session-once arrival. Native modal semantics keep background controls out of Tab order. */
export default function LandingIntro() {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const closing = useRef(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(true);
  const [staticScene, setStaticScene] = useState(true);
  const [failed, setFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const finish = useCallback(() => {
    const node = dialog.current;
    if (!node?.open || closing.current) return;
    closing.current = true;
    video.current?.pause();
    try { sessionStorage.setItem(SESSION_KEY, "done"); } catch { /* Storage denial must never block the trip. */ }
    const close = () => {
      document.documentElement.dataset.introSeen = "1";
      node.close();
      setVisible(false);
      document.getElementById("landing-title")?.focus({ preventScroll: true });
      document.documentElement.classList.remove("arrival-open");
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) close();
    else {
      const hero = document.querySelector(".landing-hero");
      const animations: Animation[] = [];
      const photo = hero?.querySelector(".story-media > img");
      if (photo) animations.push(photo.animate([{ transform: "scale(1.18)", clipPath: "inset(8% 0 0)" }, { transform: "scale(1)", clipPath: "inset(0)" }], { duration: 1100, easing: "cubic-bezier(.16,1,.3,1)" }));
      hero?.querySelectorAll("h1, .landing-hero-copy > span:not(.sr-only), .landing-actions").forEach((element, index) => {
        animations.push(element.animate([{ transform: "translateY(32px)", opacity: .25 }, { transform: "translateY(0)", opacity: 1 }], { duration: 650, delay: 180 + index * 110, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" }));
      });
      const reduction = matchMedia("(prefers-reduced-motion: reduce)");
      const stop = () => { if (reduction.matches) animations.forEach(animation => animation.cancel()); };
      reduction.addEventListener("change", stop);
      void Promise.allSettled(animations.map(animation => animation.finished)).then(() => reduction.removeEventListener("change", stop));
      node.dataset.leaving = "true"; exitTimer.current = setTimeout(close, 620); }
  }, []);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    let seen = document.documentElement.dataset.introSeen === "1";
    try { seen ||= sessionStorage.getItem(SESSION_KEY) === "done"; } catch { /* Session-memory-only fallback. */ }
    if (seen) {
      node.close(); node.hidden = true;
      if (document.documentElement.dataset.introFocus === "pending") {
        const frame = requestAnimationFrame(() => {
          const active = document.activeElement;
          if (!active || active === document.body || active === document.documentElement || active.id === "landing-title" || node.contains(active)) {
            document.getElementById("landing-title")?.focus({ preventScroll: true });
          }
          delete document.documentElement.dataset.introFocus;
        });
        return () => cancelAnimationFrame(frame);
      }
      return;
    }
    node.dataset.ready = "true";
    delete node.dataset.leaving;
    closing.current = false;
    // The server-rendered open dialog is a usable static arrival before hydration.
    node.hidden = false;
    if (node.open) node.close();
    node.showModal();
    node.querySelector<HTMLElement>("#arrival-title")?.focus({ preventScroll: true });
    document.documentElement.classList.add("arrival-open");
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
      node.close();
      document.documentElement.classList.remove("arrival-open");
    };
  }, []);

  useEffect(() => {
    const player = video.current;
    if (!player || !visible || !dialog.current?.open) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const sync = () => {
      // Read the live OS signal. A parent effect may still hold the previous
      // data-motion value when the user turns reduced motion off at runtime.
      const still = media.matches || connection?.saveData === true;
      setStaticScene(still);
      if (still || failed || document.hidden) {
        player.pause();
        if (still && player.hasAttribute("src")) { player.removeAttribute("src"); player.load(); }
        return;
      }
      if (!player.hasAttribute("src")) player.src = VIDEO;
      void player.play().catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      });
    };
    sync();
    media.addEventListener("change", sync);
    connection?.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      media.removeEventListener("change", sync);
      connection?.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      player.pause();
    };
  }, [visible, failed]);

  useEffect(() => {
    if (!visible) return;
    // Static, failed and stalled media must all hand off without a visible skip control.
    const limit = setTimeout(finish, 5200);
    return () => clearTimeout(limit);
  }, [visible, finish]);

  return <dialog ref={dialog} open className="arrival-intro" hidden={!visible} suppressHydrationWarning
    data-still={staticScene || failed}
    aria-labelledby="arrival-title" aria-describedby="arrival-description"
    onCancel={event => { event.preventDefault(); finish(); }}
    onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); finish(); return; }
      if (event.key !== "Tab") return;
      event.preventDefault();
      event.currentTarget.querySelector<HTMLElement>("#arrival-title")?.focus();
    }}>
    {!imageFailed && <img className="arrival-poster" src="/media/wave-story/hero-coast-small.webp"
      srcSet="/media/wave-story/hero-coast-small.webp 840w, /media/wave-story/hero-coast.webp 1672w"
      sizes="100vw" width="1672" height="941" alt="" fetchPriority="high" onError={() => setImageFailed(true)} />}
    <video ref={video} className="arrival-film" muted playsInline preload="none" aria-hidden="true" tabIndex={-1}
      onEnded={finish} onError={() => setFailed(true)} />
    {/* The final wordmark is crisp HTML; do not draw a second, offset glyph copy behind it. */}
    {visible && <WaveField className="arrival-wave-canvas" tone="deep" mode="intro" wordmark="" paused={staticScene || failed} />}
    <div className="arrival-top"><span>{en ? "A journey for every way of moving" : "여행의 가능성을 넓히다"}</span></div>
    <div className="arrival-brand">
      <p>{en ? "GYEONGNAM · YOUR OWN PACE" : "누구나, 나의 속도로"}</p>
      <h2 id="arrival-title" tabIndex={0}>WAVE</h2>
      <p id="arrival-description">{en ? "From the facilities you need to a new day in Gyeongnam." : "필요한 편의에서, 경남의 새로운 하루로."}</p>
    </div>
    <div className="arrival-bottom">
      <div>
        <p className="sr-only" role="status">{failed ? (en ? "The video is unavailable. Continue with the still scene." : "영상을 불러오지 못해 정지된 풍경을 보여드려요.") : staticScene ? (en ? "A still introduction follows your motion and data preferences." : "동작·데이터 설정에 맞춰 정지된 장면을 보여드려요.") : (en ? "The landing page follows this short, silent scene." : "짧은 무음 장면 뒤 서비스 소개로 이어집니다.")}</p>
      </div>

    </div>
  </dialog>;
}
