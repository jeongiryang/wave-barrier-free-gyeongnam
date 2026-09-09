"use client";
import AccessIcon from "../../../components/AccessIcons";
import { useSitePreferences } from "../../../components/SitePreferences";
import { profiles } from "../../planner/constants";
import { englishProfiles } from "../../planner/condition-copy";
import { useStoryPlayback } from "../hooks/useStoryPlayback";
/** The real facility catalog and visual vocabulary, without Planner state handlers. */
export default function LandingNeedsDemo() {
  const en = useSitePreferences().locale === "en";
  const { root, index: step, running, still } = useStoryPlayback(4, 1400);
  const selected = step >= 2 ? ["senior", "visual"] : step >= 1 ? ["senior"] : [];
  const label = (profile: typeof profiles[number]) => en ? englishProfiles[profile.id] : profile;
  return <div ref={root} className="needs-demo story-demo" data-demo="facilities" data-step={step} data-running={running} data-still={still}>
    <div className="demo-topline"><strong>{en ? "What facilities do you need?" : "어떤 편의가 필요할까요?"}</strong><span aria-hidden="true">↗</span></div>
    <div className="demo-profile-grid" aria-hidden="true">{profiles.map(profile => <div key={profile.id} className="demo-profile" data-selected={selected.includes(profile.id)} data-profile-id={profile.id}><AccessIcon name={profile.icon} size={24}/><div><strong>{label(profile).label}</strong><small>{label(profile).short}</small></div><span>{selected.includes(profile.id) ? "✓" : "+"}</span></div>)}</div>
    <p className="demo-selection" aria-hidden="true">{selected.length ? <><b>{en ? `${selected.length} facilities selected` : `편의 조건 ${selected.length}개 선택`}</b><span>{profiles.filter(p => selected.includes(p.id)).map(p => label(p).label).join(" · ")}</span></> : en ? "Choose the facilities for your journey." : "내 여행에 필요한 편의를 골라요."}</p>
    <p className="sr-only">{en ? "Example: select access paths and lifts, then visual information support. Your selected facilities appear together in a summary." : "선택 예시: 접근로와 승강기, 시각 정보 지원을 차례로 고르면 선택한 두 편의 조건이 요약됩니다."}</p>
  </div>;
}
