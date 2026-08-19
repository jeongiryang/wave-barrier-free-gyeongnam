import AccessIcon from "../../../components/AccessIcons";
import { profiles } from "../constants";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";

export default function PlannerAccessibilityProfiles({ t, planController, onGenerate }: {
  t: (key: string, fallback: string) => string;
  planController: ReturnType<typeof usePlannerPlan>;
  onGenerate: (revealResults?: boolean) => void | Promise<void>;
}) {
  const { selected, loading, notice, toggleProfile } = planController;
  const activeProfiles = profiles.filter((profile) => selected.includes(profile.id));
  return <>
    <div className="control-panel profile-panel">
      <div className="preference-label"><span className="step-label"><b>05</b> {t("support", "어떤 편의가 필요할까요?")}</span><small>여러 개 선택 가능</small></div>
      <div className="profile-grid" role="group" aria-label="여행 편의 조건 선택">
        {profiles.map((profile) => {
          const active = selected.includes(profile.id);
          return <button key={profile.id} type="button" className={active ? "profile-card active" : "profile-card"} aria-pressed={active} onClick={() => toggleProfile(profile.id)}><span className="profile-icon" aria-hidden="true"><AccessIcon name={profile.icon} size={24} /></span><span><strong>{profile.label}</strong><small>{profile.short}</small></span><i aria-hidden="true">{active ? "✓" : "+"}</i></button>;
        })}
      </div>
      <p className="derived-note">‘걷기 불편’과 ‘임산부’는 무장애 API의 접근로·승강기·화장실 항목을 W.A.V.E 기준으로 조합한 필터입니다.</p>
    </div>
    <div className="selection-bar" aria-live="polite">
      <div><span className="pulse-dot" aria-hidden="true" /><p><b>{activeProfiles.length || "조건을"}개 선택</b><span>{activeProfiles.length ? activeProfiles.map((item) => item.label).join(" · ") : "원하는 여행 조건을 골라주세요"}</span></p></div>
      <button className="generate-button" type="button" onClick={() => void onGenerate(true)} disabled={!selected.length || loading}>{loading ? <><span className="button-loader" /> 자동 갱신 중</> : <>결과 새로고침 <span aria-hidden="true">↻</span></>}</button>
    </div>
    <p className="planner-notice" aria-live="polite">{notice}</p>
  </>;
}
