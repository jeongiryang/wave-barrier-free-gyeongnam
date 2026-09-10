"use client";

import { useSitePreferences } from "../../../components/SitePreferences";

type Stage = "conditions" | "evidence" | "schedule" | "route" | "adapt" | "save" | "community";
const labels: Record<Stage, [string, string]> = {
  conditions: ["지역과 필요한 편의를 고른 뒤 추천 찾기", "Choose a region and facilities, then find places"],
  evidence: ["공식 정보의 확인·미확인·불일치 구분", "Distinguish reported, missing and unavailable facilities"],
  schedule: ["장소를 날짜별로 나누고 방문 순서 정하기", "Assign places to dates and order each day's visits"],
  route: ["출발지와 모든 인접 이동 구간 확인", "Check the starting point and every adjacent journey"],
  adapt: ["비가 예상되면 같은 편의조건의 대안 비교", "If rain is expected, compare alternatives with the same facilities"],
  save: ["여행집에 보관하고 다시 이어가기", "Keep a trip in your travel book and continue later"],
  community: ["장소의 질문과 현장 경험을 공식 정보와 구분", "Keep place questions and visitor experiences separate from official records"],
};

/** Small conceptual diagrams; these are not live routes, forecasts or visitor posts. */
export default function CompactJourneyVisual({ stage }: { stage: Stage }) {
  const { locale } = useSitePreferences();
  const label = labels[stage][locale === "en" ? 1 : 0];
  return <figure className="compact-journey-visual" data-journey={stage}>
    <svg viewBox="0 0 280 116" role="img" aria-label={label}>
      {stage === "conditions" && <>
        <path d="M50 87S24 64 24 43a26 26 0 0 1 52 0c0 21-26 44-26 44Z" /><circle cx="50" cy="43" r="9" />
        <rect x="106" y="23" width="60" height="64" rx="10" /><path d="m119 54 11 11 24-27M189 55h30m-9-9 9 9-9 9" />
        <rect x="232" y="28" width="29" height="49" rx="5" /><path d="M241 42h11m-11 11h11m-11 11h7" />
      </>}
      {stage === "evidence" && <>
        <rect x="20" y="24" width="64" height="68" rx="10" /><rect x="108" y="24" width="64" height="68" rx="10" /><rect x="196" y="24" width="64" height="68" rx="10" />
        <path d="m37 57 10 10 22-24M131 46c0-13 22-13 22 0 0 9-13 9-13 18m0 9v1M216 43l25 27m0-27-25 27" />
      </>}
      {stage === "schedule" && <>
        <rect x="28" y="20" width="224" height="78" rx="8" /><path d="M28 42h224M65 12v18m150-18v18M102 42v56m76-56v56" />
        <circle cx="65" cy="70" r="17" /><circle cx="140" cy="70" r="17" /><path d="M65 62v16m67-16h16l-16 16h16M199 63h32m-32 13h22" />
      </>}
      {stage === "route" && <>
        <path className="compact-route-connection" d="M40 75h54q16 0 16-16V44q0-16 16-16h25q16 0 16 16v15q0 16 16 16h55" />
        <circle cx="40" cy="75" r="14" /><circle cx="40" cy="75" r="4" /><circle cx="141" cy="28" r="14" /><circle cx="238" cy="75" r="14" /><path d="M141 22v12m93 35h8l-8 12h8" />
      </>}
      {stage === "adapt" && <>
        <path d="M35 59h55a17 17 0 0 0-1-34 25 25 0 0 0-46-1 18 18 0 0 0-8 35ZM48 72l-5 12m27-12-5 12m27-12-5 12M118 55h40m-11-11 11 11-11 11" />
        <path d="m189 43 29-23 29 23v47h-58ZM209 90V65h18v25M201 49h8m17 0h8" />
      </>}
      {stage === "save" && <>
        <rect x="28" y="18" width="80" height="80" rx="9" /><path d="M46 18v80m14-58h30m-30 17h30m-30 17h20M132 54h29m-9-9 9 9-9 9" />
        <rect x="191" y="20" width="56" height="76" rx="8" /><path d="m204 58 10 10 21-26M212 86h14" />
      </>}
      {stage === "community" && <>
        <path d="M30 20h92a9 9 0 0 1 9 9v39a9 9 0 0 1-9 9H62L40 94V77H30a9 9 0 0 1-9-9V29a9 9 0 0 1 9-9ZM160 32h89a9 9 0 0 1 9 9v37a9 9 0 0 1-9 9h-10v16l-22-16h-57a9 9 0 0 1-9-9V41a9 9 0 0 1 9-9Z" />
        <path d="M44 40h62M44 56h42M170 53h60m-60 16h40" />
      </>}
    </svg>
    <figcaption>{label}</figcaption>
  </figure>;
}
