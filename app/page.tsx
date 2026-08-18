"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { PreferenceControls, useSitePreferences } from "../components/SitePreferences";
import AccountMenu from "../components/AccountMenu";
import HelpCenter from "../components/HelpCenter";

const regions = [
  { name: "거창", icon: "🎭", story: "수승대와 산골 무대", x: 19, y: 16 },
  { name: "합천", icon: "🎬", story: "황매산과 영화 이야기", x: 46, y: 15 },
  { name: "창녕", icon: "🌾", story: "우포늪과 낙동강 유채", x: 66, y: 20 },
  { name: "밀양", icon: "🎶", story: "영남루와 아리랑", x: 79, y: 25 },
  { name: "양산", icon: "⛰️", story: "통도사와 천성산", x: 91, y: 34 },
  { name: "함양", icon: "🌱", story: "지리산과 산삼", x: 14, y: 38 },
  { name: "산청", icon: "🌿", story: "동의보감촌과 약초", x: 31, y: 43 },
  { name: "의령", icon: "⚔️", story: "홍의장군의 의병 정신", x: 51, y: 40 },
  { name: "함안", icon: "🔥", story: "아라가야와 낙화놀이", x: 63, y: 47 },
  { name: "김해", icon: "🏺", story: "가야 왕도와 분청도자", x: 84, y: 50 },
  { name: "창원", icon: "🌸", story: "진해 벚꽃과 해양공원", x: 73, y: 58 },
  { name: "하동", icon: "🍵", story: "섬진강과 천년 야생차", x: 18, y: 68 },
  { name: "진주", icon: "🏮", story: "남강을 밝히는 유등", x: 42, y: 60 },
  { name: "사천", icon: "✈️", story: "바다 위로 오르는 항공", x: 36, y: 73 },
  { name: "고성", icon: "🦕", story: "공룡 발자국과 당항포", x: 55, y: 72 },
  { name: "남해", icon: "🏘️", story: "다랭이마을과 독일마을", x: 28, y: 88 },
  { name: "통영", icon: "⛵", story: "한려수도와 이순신", x: 56, y: 88 },
  { name: "거제", icon: "🌼", story: "바람의 언덕과 섬꽃", x: 75, y: 87 },
];

const values = [
  { number: "01", title: "조건을 먼저", copy: "휠체어, 걷기 부담, 영유아, 임산부, 시청각 지원처럼 여행자의 실제 조건에서 출발합니다." },
  { number: "02", title: "근거를 함께", copy: "관광지 사진만 보여주지 않고 접근로·화장실·승강기와 데이터 기준 시점을 함께 표시합니다." },
  { number: "03", title: "이동까지 연결", copy: "관광지를 고르는 데서 끝내지 않고 시간·요금·환승·도보를 비교해 하루의 이동을 설계합니다." },
];

type RegionPhoto = { id: string; title: string; image: string; location: string; photographer: string; month: string };

function Intro({ close }: { close: () => void }) {
  const { t } = useSitePreferences();
  return (
    <div className="brand-intro" role="dialog" aria-label="W.A.V.E 시작 화면">
      <button type="button" onClick={close}>{t("use", "바로 시작")}</button>
      <div className="intro-tide" aria-hidden="true"><i /><i /><i /></div>
      <p>TRAVEL WITHOUT BARRIERS</p>
      <h1><span>W</span><span>.</span><span>A</span><span>.</span><span>V</span><span>.</span><span>E</span></h1>
      <div className="intro-statement"><span>갈 수 있는 곳을 찾고</span><span>가고 싶은 하루를 만들고</span><strong>모두의 여행을 연결합니다.</strong></div>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useSitePreferences();
  const [intro, setIntro] = useState(true);
  const [activeRegion, setActiveRegion] = useState("창원");
  const [previewRegion, setPreviewRegion] = useState<string | null>(null);
  const [regionPhotos, setRegionPhotos] = useState<Record<string, RegionPhoto | null | undefined>>({});
  const [scrolled, setScrolled] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");
  const landingRef = useRef<HTMLElement>(null);
  const photoRequests = useRef(new Set<string>());
  const active = useMemo(() => regions.find((item) => item.name === activeRegion) ?? regions[10], [activeRegion]);
  const preview = useMemo(() => regions.find((item) => item.name === previewRegion) ?? null, [previewRegion]);

  const loadRegionPhoto = useCallback(async (region: string) => {
    if (photoRequests.current.has(region)) return;
    photoRequests.current.add(region);
    try {
      const response = await fetch(`/api/wave?action=photo&region=${encodeURIComponent(region)}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("photo request failed");
      const payload = await response.json() as { photo?: RegionPhoto | null };
      setRegionPhotos((current) => ({ ...current, [region]: payload.photo || null }));
    } catch {
      setRegionPhotos((current) => ({ ...current, [region]: null }));
    }
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = window.sessionStorage.getItem("wave-intro-seen-v2");
    if (reduced || seen) {
      const frame = window.requestAnimationFrame(() => setIntro(false));
      return () => window.cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(() => finishIntro(), 2600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      setScrolled(y > 32);
      if (y > lastY + 6) setScrollDirection("down");
      if (y < lastY - 6) setScrollDirection("up");
      landingRef.current?.style.setProperty("--landing-progress", String(Math.min(y / max, 1)));
      landingRef.current?.style.setProperty("--hero-shift", `${Math.min(y, 820)}px`);
      lastY = y;
      ticking = false;
    };
    const onScroll = () => { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = document.querySelectorAll<HTMLElement>("[data-land-reveal]");
    if (reduced) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) (entry.target as HTMLElement).classList.add("is-visible");
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -10%" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  function finishIntro() {
    window.sessionStorage.setItem("wave-intro-seen-v2", "1");
    setIntro(false);
  }

  function selectRegion(region: string) {
    const update = () => setActiveRegion(region);
    const documentWithTransitions = document as Document & { startViewTransition?: (callback: () => void) => unknown };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !documentWithTransitions.startViewTransition) update();
    else documentWithTransitions.startViewTransition(update);
  }

  return (
    <main ref={landingRef} className="landing-page" data-scroll-direction={scrollDirection} onPointerMove={(event) => {
      const rect = landingRef.current?.getBoundingClientRect();
      if (!rect || !landingRef.current) return;
      landingRef.current.style.setProperty("--pointer-x", `${event.clientX}px`);
      landingRef.current.style.setProperty("--pointer-y", `${event.clientY}px`);
      landingRef.current.style.setProperty("--pointer-rx", String((event.clientX / Math.max(window.innerWidth, 1) - .5) * 2));
      landingRef.current.style.setProperty("--pointer-ry", String((event.clientY / Math.max(window.innerHeight, 1) - .5) * 2));
    }}>
      {intro && <Intro close={finishIntro} />}
      <div className="landing-pointer-glow" aria-hidden="true" />
      <aside className="chapter-rail" aria-hidden="true"><span>INTRO</span><i><b /></i><span>GO</span></aside>
      <a className="skip-link" href="#story">{t("skip", "소개 바로가기")}</a>
      <header className={scrolled ? "landing-header scrolled" : "landing-header"}>
        <a className="brand" href="#top" aria-label="W.A.V.E 홈">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span>
        </a>
        <nav aria-label="소개 메뉴"><a href="#story">{t("service", "서비스")}</a><a href="#regions">{t("regions", "경남 18개 지역")}</a><a href="#evidence">{t("data", "데이터")}</a></nav>
        <div className="landing-header-actions"><HelpCenter /><PreferenceControls /><AccountMenu /><a className="landing-start" href="/planner">{t("use", "서비스 이용하기")} <span>↗</span></a></div>
      </header>

      <section className="landing-hero" id="top">
        <div className="hero-tide" aria-hidden="true"><i /><i /><i /></div>
        <div className="landing-orbit orbit-a" aria-hidden="true" /><div className="landing-orbit orbit-b" aria-hidden="true" />
        <div className="landing-hero-copy" data-land-reveal>
          <p><span>{t("heroBadge", "경상남도 무장애 여행")}</span> 2026 TOUR DATA</p>
          <h1>{t("heroTitle", "갈 수 있는 곳을 넘어,")}<br /><em>{t("heroEm", "가고 싶은 하루로.")}</em></h1>
          <span>{t("heroCopy", "W.A.V.E는 여행자의 이동 조건과 경남 관광 데이터를 연결해 장소 선택부터 실제 이동까지 설계하는 여행 동행 서비스입니다.")}</span>
          <div className="landing-actions"><a href="/planner">{t("plan", "내 여행 설계하기")} <b>→</b></a><a href="#story">{t("learn", "서비스 알아보기")}</a></div>
        </div>
        <div className="landing-signal" aria-label="서비스 데이터 흐름" data-land-reveal>
          <div className="signal-core"><span>W.A.V.E</span><small>TRAVEL ENGINE</small></div>
          <span className="signal-node node-one">{t("tourism", "관광정보")}</span><span className="signal-node node-two">{t("accessible", "무장애 정보")}</span><span className="signal-node node-three">{t("mobility", "이동 경로")}</span><span className="signal-node node-four">{t("stories", "지역 이야기")}</span>
        </div>
        <div className="landing-scroll" aria-hidden="true">SCROLL <i /></div>
      </section>

      <section className="manifesto" id="story">
        <div className="section-tide" aria-hidden="true"><i /><i /></div>
        <p className="section-kicker" data-land-reveal>WHY W.A.V.E</p>
        <h2 data-land-reveal>{t("whyTitle", "여행 정보는 많지만, 내가 갈 수 있는지는 찾기 어렵습니다.")}</h2>
        <div className="manifesto-grid">
          {values.map((value, index) => <article key={value.number} data-land-reveal><span>{value.number}</span><h3>{t(`value${index + 1}`, value.title)}</h3><p>{t(`value${index + 1}Copy`, value.copy)}</p></article>)}
        </div>
      </section>

      <section className="region-story" id="regions">
        <div className="region-story-copy" data-land-reveal>
          <p className="section-kicker">18 CITIES · 18 STORIES</p>
          <h2>{t("regionTitle", "경남의 경계 안에 열여덟 개의 이야기가 있습니다.")}</h2>
          <p>{t("regionCopy", "지역 표식을 눌러 대표 이야기를 살펴보고, 선택한 지역으로 바로 여행 설계를 시작하세요.")}</p>
          <div className="selected-region">{regionPhotos[active.name]?.image ? <span className="selected-region-photo" style={{ backgroundImage: `url("${regionPhotos[active.name]!.image}")` }} aria-hidden="true" /> : <span>{active.icon}</span>}<div><small>{t("selected", "지금 선택한 지역")}</small><strong>{active.name}</strong><p>{active.story}</p></div></div>
          <a href={`/planner?region=${encodeURIComponent(active.name)}`}>{active.name} {t("makeTrip", "여행 만들기")} <b>→</b></a>
        </div>
        <div className="landing-region-map" data-land-reveal>
          {/* Public-domain administrative map from Wikimedia Commons. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://upload.wikimedia.org/wikipedia/commons/4/40/Map_Gyeosangnam-do.svg" alt="경상남도 시군 경계 지도" />
          {regions.map((region, index) => <button key={region.name} type="button" className={activeRegion === region.name ? "active" : ""} style={{ left: `${region.x}%`, top: `${region.y}%`, "--region-index": index } as CSSProperties} onClick={() => selectRegion(region.name)} onPointerEnter={() => { setPreviewRegion(region.name); void loadRegionPhoto(region.name); }} onPointerLeave={() => setPreviewRegion(null)} onFocus={() => { setPreviewRegion(region.name); void loadRegionPhoto(region.name); }} onBlur={() => setPreviewRegion(null)} aria-label={`${region.name}: ${region.story}`}><span>{region.icon}</span><b>{region.name}</b></button>)}
          {preview && <div className={`region-photo-preview${regionPhotos[preview.name] === undefined ? " loading" : ""}`} style={{ left: `${preview.x}%`, top: `${preview.y}%` }} aria-live="polite">
            {regionPhotos[preview.name]?.image ? <div style={{ backgroundImage: `linear-gradient(180deg,transparent 32%,rgba(3,24,41,.78)),url("${regionPhotos[preview.name]!.image}")` }} /> : regionPhotos[preview.name] === undefined ? <div className="region-photo-skeleton"><i /><i /></div> : <div className="region-photo-placeholder"><small>OFFICIAL PHOTO</small><strong>{preview.name}</strong></div>}
            <section className={regionPhotos[preview.name] === undefined ? "loading-copy" : ""}><small>{regionPhotos[preview.name]?.location || "경상남도 관광사진"}</small><strong>{regionPhotos[preview.name]?.title || `${preview.name}의 여행 이야기`}</strong><span>{regionPhotos[preview.name] === undefined ? "공식 관광사진 불러오는 중" : preview.story}</span></section>
          </div>}
        </div>
      </section>

      <section className="evidence-story" id="evidence">
        <div className="section-tide reverse" aria-hidden="true"><i /><i /></div>
        <div data-land-reveal><p className="section-kicker">VISIBLE EVIDENCE</p><h2>{t("evidenceTitle", "추천의 이유와 한계까지 보여줍니다.")}</h2></div>
        <div className="evidence-stack">
          <article data-land-reveal><span>01</span><div><h3>{t("evidence1", "관광지와 사진")}</h3><p>{t("evidence1Copy", "한국관광공사 관광·사진 데이터를 지역과 장소 기준으로 교차 확인합니다.")}</p></div></article>
          <article data-land-reveal><span>02</span><div><h3>{t("evidence2", "접근성과 이동")}</h3><p>{t("evidence2Copy", "시설 편의정보와 도보·환승·시간·예상 요금을 서로 다른 지표로 비교합니다.")}</p></div></article>
          <article data-land-reveal><span>03</span><div><h3>{t("evidence3", "업데이트 시각")}</h3><p>{t("evidence3Copy", "공식 인증과 서비스 적합도를 구분하고 데이터 기준일과 신뢰도를 표시합니다.")}</p></div></article>
        </div>
      </section>

      <section className="landing-cta" data-land-reveal>
        <p>READY TO TRAVEL?</p><h2>{t("ctaTitle", "소개는 여기까지.")}<br /><em>{t("ctaEm", "이제 실제 여행을 설계하세요.")}</em></h2><a href="/planner">{t("start", "W.A.V.E 시작하기")} <span>↗</span></a>
      </section>

      <footer className="simple-footer"><div className="brand footer-brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></div><p>{t("footer", "누구나 원하는 곳으로, 경남 무장애 여행 길잡이")}</p><p className="source">출처: ⓒ한국관광공사 · ⓒ한국관광콘텐츠랩</p></footer>
    </main>
  );
}
