"use client";

import { useEffect, useRef } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";

/** The frame changes with scroll; content never waits for the animation. */
export default function LandingExpansionScene() {
  const { locale, motion } = useSitePreferences();
  const en = locale === "en";
  const scene = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = scene.current;
    if (!node) return;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const reduced = query.matches || motion === "calm" || innerWidth < 768;
      const progress = reduced ? 1 : Math.max(0, Math.min(1, (innerHeight * .95 - rect.top) / (innerHeight * .65)));
      node.style.setProperty("--scene-open", progress.toFixed(3));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule, { passive: true });
    query.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      query.removeEventListener("change", schedule);
    };
  }, [motion]);

  return <section ref={scene} className="story-expansion" aria-labelledby="story-expansion-title">
    <div className="story-expansion-frame">
      <img src="/media/wave-story/ocean-expand-small.webp" srcSet="/media/wave-story/ocean-expand-small.webp 840w, /media/wave-story/ocean-expand.webp 1672w" sizes="100vw" width="1672" height="941" loading="lazy" alt="" />
    </div>
    <div className="story-expansion-copy">
      <p>{en ? "More room for your journey" : "여행의 가능성을 넓히다"}</p>
      <h2 id="story-expansion-title">{en ? "Less uncertainty." : "걱정은 덜고,"}<br />{en ? "More of your own journey." : "여행은 더 넓게."}</h2>
      <p>{en ? "Find the facilities you need. Bring your places, dates and travel information together." : "필요한 편의를 확인하고, 가고 싶은 장소와 날짜를 하나의 여행으로 연결하세요."}</p>
      <a href="/planner">{en ? "Start my journey" : "내 여행 시작하기"} <span aria-hidden="true">↗</span></a>
    </div>
    <p className="story-expansion-source">{en ? "Imagined scenery · not an actual place or facility record" : "상상 풍경 · 실제 장소나 편의시설 정보가 아닙니다"}</p>
  </section>;
}
