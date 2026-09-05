"use client";

import { useSitePreferences } from "./SitePreferences";
import { regionBoundaries } from "../features/landing/region-boundaries";

export const regionNames: Record<string, string> = { "경남 전체": "All Gyeongnam", 창원: "Changwon", 진주: "Jinju", 통영: "Tongyeong", 사천: "Sacheon", 김해: "Gimhae", 밀양: "Miryang", 거제: "Geoje", 양산: "Yangsan", 의령: "Uiryeong", 함안: "Haman", 창녕: "Changnyeong", 고성: "Goseong", 남해: "Namhae", 하동: "Hadong", 산청: "Sancheong", 함양: "Hamyang", 거창: "Geochang", 합천: "Hapcheon" };

export default function GyeongnamRegionPicker({ value, onChange, includeAll = false }: { value: string; onChange: (region: string) => void; includeAll?: boolean }) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const label = (name: string) => en ? regionNames[name] || name : name;
  const names = Object.keys(regionNames).filter((name) => includeAll || name !== "경남 전체");
  return <div className="region-picker">
    <div className="region-picker-visual">
      <span>{en ? "SOUTH KOREA · SOUTHEAST" : "대한민국 남동쪽, 경상남도"}</span>
      <svg viewBox="0 0 800 814" aria-label={en ? "Gyeongnam city and county boundaries" : "경상남도 시·군 행정경계"}>
        {regionBoundaries.map((region) => <g key={region.name} aria-hidden="true" aria-pressed={region.name === value} onClick={() => onChange(region.name)}><path d={region.path} fillRule="evenodd" /><circle cx={region.x} cy={region.y} r="5" />{region.name === value && <text x={region.x} y={region.y - 14} textAnchor="middle">{label(region.name)}</text>}</g>)}
      </svg>
      <small>{en ? "SGIS 2020 · simplified boundaries / StatGarten" : "통계청 SGIS 2020 · 경계 단순화 / StatGarten"}</small>
    </div>
    <div><p className="sr-only" id="region-keyboard-hint">{en ? "Use arrow keys to move between regions, then Enter to choose." : "방향키로 지역을 이동하고 Enter로 선택할 수 있습니다."}</p><div className="region-picker-list" role="group" aria-describedby="region-keyboard-hint" aria-label={en ? "Choose a region" : "여행 지역 선택"}>{names.map((name, index) => <button type="button" key={name} tabIndex={value === name || !value && index === 0 ? 0 : -1} onClick={() => onChange(name)} onKeyDown={(event) => {
      const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
      const next = event.key === "Home" ? 0 : event.key === "End" ? names.length - 1 : direction ? (index + direction + names.length) % names.length : -1;
      if (next < 0) return;
      event.preventDefault();
      event.currentTarget.parentElement?.querySelectorAll("button")[next]?.focus();
    }} aria-pressed={value === name}>{label(name)}{value === name && <span aria-hidden="true"> ✓</span>}</button>)}</div></div>
  </div>;
}
