"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type TourStep = {
  selector: string;
  highlightSelector: string;
  eyebrow: string;
  title: string;
  copy: string;
};

type Highlight = {
  top: number;
  left: number;
  width: number;
  height: number;
  pointerX: number;
  pointerY: number;
};

const landingSteps: TourStep[] = [
  { selector: "#top", highlightSelector: "#top .landing-hero-copy", eyebrow: "서비스 소개", title: "W.A.V.E를 한눈에 살펴보세요.", copy: "여행자의 이동 조건과 경남 관광 데이터를 연결해 장소 선택부터 실제 이동까지 돕는 서비스입니다." },
  { selector: "#story", highlightSelector: "#story > h2", eyebrow: "이용 원칙", title: "갈 수 있는지를 먼저 확인합니다.", copy: "사진만 보여 주지 않고 접근로·화장실·승강기와 이동 부담을 함께 비교합니다." },
  { selector: "#regions", highlightSelector: "#regions .region-story-copy", eyebrow: "지역 탐색", title: "경남 18개 지역의 이야기를 고르세요.", copy: "지도에서 지역을 선택하면 공식 관광사진과 지역별 여행 이야기를 확인할 수 있습니다." },
  { selector: "#evidence", highlightSelector: "#evidence > div:first-child", eyebrow: "추천 근거", title: "추천의 이유와 한계를 공개합니다.", copy: "관광·접근성·교통 데이터의 출처와 기준 시점을 나누어 보여 줍니다." },
  { selector: ".landing-cta", highlightSelector: ".landing-cta > h2", eyebrow: "여행 시작", title: "이제 내 여행을 설계해 보세요.", copy: "여행 만들기로 이동해 지역, 관심사, 필요한 편의와 출발지를 선택할 수 있습니다." },
];

const plannerSteps: TourStep[] = [
  { selector: "#planner", highlightSelector: "#planner .workspace-heading", eyebrow: "1단계 · 여행 조건", title: "내게 필요한 여행 조건을 고르세요.", copy: "출발지, 지역, 날짜, 관심사와 휠체어·영유아·시청각 지원 같은 편의를 선택합니다." },
  { selector: "#places", highlightSelector: "#places .workspace-heading", eyebrow: "2단계 · 추천 여행지", title: "접근성과 적합도를 비교하세요.", copy: "추천 카드에서 시설 정보, 확인률과 공식 관광사진을 보고 장소를 여행 보관함에 담습니다." },
  { selector: "#layers", highlightSelector: "#layers .workspace-heading", eyebrow: "3단계 · 실시간 변수", title: "날씨와 지역 흐름을 함께 확인하세요.", copy: "여행 중 바뀔 수 있는 날씨, 방문 흐름과 테마 데이터를 확인해 계획을 조정합니다." },
  { selector: "#navigation", highlightSelector: "#navigation .workspace-heading", eyebrow: "4단계 · 길찾기", title: "실제 이동 방법을 비교하세요.", copy: "출발지와 목적지를 정하고 지도, 예상 시간, 도보 부담과 이용 가능한 교통정보를 확인합니다." },
  { selector: "#route", highlightSelector: "#route .route-intro", eyebrow: "5단계 · 하루 동선", title: "선택한 장소를 하루 일정으로 잇습니다.", copy: "추천 순서와 이동 구간을 검토하고 필요하면 장소나 출발지를 바꿔 다시 계산합니다." },
  { selector: "#data", highlightSelector: "#data .data-heading", eyebrow: "6단계 · 데이터 근거", title: "마지막으로 출처를 확인하세요.", copy: "정보가 없거나 오래된 항목을 구분하고, 방문 전 운영기관의 최신 안내를 다시 확인해 주세요." },
];

export default function HelpCenter() {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function startTour() {
    const candidates = document.querySelector(".planner-page") ? plannerSteps : landingSteps;
    const available = candidates.filter((step) => document.querySelector(step.selector));
    setHighlight(null);
    setSteps(available);
    setStepIndex(0);
    setOpen(available.length > 0);
  }

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(() => dialogRef.current?.querySelector<HTMLButtonElement>(".help-tour-close")?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const step = steps[stepIndex];
    const section = step ? document.querySelector<HTMLElement>(step.selector) : null;
    const target = step ? document.querySelector<HTMLElement>(step.highlightSelector) || section : null;
    if (!section || !target) return;
    section.dataset.helpTourActive = "true";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targetTop = window.scrollY + target.getBoundingClientRect().top - Math.min(104, window.innerHeight * 0.16);
    window.scrollTo({ top: Math.max(0, targetTop), behavior: reduced ? "auto" : "smooth" });

    let frame = 0;
    const updateHighlight = () => {
      frame = 0;
      const rect = target.getBoundingClientRect();
      const gutter = 12;
      const dialog = dialogRef.current?.getBoundingClientRect();
      const left = Math.max(gutter, rect.left - 8);
      const right = Math.min(window.innerWidth - gutter, rect.right + 8);
      const top = Math.max(gutter, rect.top - 8);
      const overlapsDialog = dialog && right > dialog.left - gutter && left < dialog.right + gutter;
      const availableBottom = overlapsDialog ? Math.min(window.innerHeight - gutter, dialog.top - gutter) : window.innerHeight - gutter;
      const bottom = Math.min(availableBottom, rect.bottom + 8, top + Math.max(120, window.innerHeight * 0.46));
      const width = Math.max(0, right - left);
      const height = Math.max(0, bottom - top);
      if (width < 40 || height < 40) {
        setHighlight(null);
        return;
      }
      setHighlight({
        top,
        left,
        width,
        height,
        pointerX: Math.min(window.innerWidth - 26, Math.max(20, right - 34)),
        pointerY: Math.min(window.innerHeight - 26, Math.max(20, top + Math.min(32, height / 2))),
      });
    };
    const queueUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateHighlight);
    };
    queueUpdate();
    const settleTimer = window.setTimeout(queueUpdate, reduced ? 0 : 520);
    window.addEventListener("scroll", queueUpdate, { passive: true });
    window.addEventListener("resize", queueUpdate);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(queueUpdate);
    resizeObserver?.observe(target);
    return () => {
      delete section.dataset.helpTourActive;
      window.clearTimeout(settleTimer);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", queueUpdate);
      window.removeEventListener("resize", queueUpdate);
      resizeObserver?.disconnect();
    };
  }, [open, stepIndex, steps]);

  const step = steps[stepIndex];
  const spotlightStyle = highlight ? ({ top: highlight.top, left: highlight.left, width: highlight.width, height: highlight.height } satisfies CSSProperties) : undefined;
  const pointerStyle = highlight ? ({ left: highlight.pointerX, top: highlight.pointerY } satisfies CSSProperties) : undefined;

  return <>
    <button className="help-button" type="button" onClick={startTour} ref={triggerRef}>도움말 <span>?</span></button>
    {open && step && <>
      <button className="help-tour-shield" type="button" onClick={() => setOpen(false)} aria-label="도움말 투어 닫기" />
      {highlight && <div className="help-tour-spotlight" style={spotlightStyle} aria-hidden="true" />}
      {highlight && <span className="help-tour-pointer" style={pointerStyle} aria-hidden="true">➤</span>}
      <div className="help-tour-dialog" role="dialog" aria-modal="true" aria-labelledby="help-tour-title" aria-describedby="help-tour-copy" ref={dialogRef}>
        <button className="help-tour-close" type="button" onClick={() => setOpen(false)} aria-label="도움말 닫기">×</button>
        <div className="help-tour-progress" aria-label={`${steps.length}단계 중 ${stepIndex + 1}단계`}>
          {steps.map((item, index) => <i className={index <= stepIndex ? "active" : ""} key={item.selector} />)}
        </div>
        <span className="dialog-kicker">{step.eyebrow}</span>
        <h2 id="help-tour-title">{step.title}</h2>
        <p id="help-tour-copy" aria-live="polite">{step.copy}</p>
        <small>강조된 테두리와 안내 포인터가 현재 설명하는 영역을 가리킵니다.</small>
        <div className="help-tour-actions">
          <button type="button" onClick={() => { setHighlight(null); setStepIndex((index) => Math.max(0, index - 1)); }} disabled={stepIndex === 0}>이전</button>
          <button type="button" className="primary" onClick={() => {
            if (stepIndex === steps.length - 1) setOpen(false);
            else { setHighlight(null); setStepIndex((index) => index + 1); }
          }}>{stepIndex === steps.length - 1 ? "투어 마치기" : "다음 영역"}</button>
        </div>
      </div>
    </>}
  </>;
}
