import AccessIcon from "../../../components/AccessIcons";
import { profiles } from "../constants";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";

export default function PlannerAccessibilityProfiles({ t, planController }: {
  t: (key: string, fallback: string) => string;
  planController: ReturnType<typeof usePlannerPlan>;
}) {
  const {
    selected, loading, notice, toggleProfile, clearSelectedProfiles,
    savedProfile, profileNotice, saveTravelProfile, deleteTravelProfile, applyTravelProfile,
  } = planController;
  const activeProfiles = profiles.filter((profile) => selected.includes(profile.id));
  const savedProfiles = profiles.filter((profile) => savedProfile?.selectedIds.includes(profile.id));
  return <>
    <div className="control-panel profile-panel">
      <div className="preference-label"><span className="step-label">{t("support", "어떤 편의가 필요할까요?")}</span><small>여러 개 선택 가능</small></div>
      <div className="profile-grid" role="group" aria-label="여행 편의 조건 선택">
        {profiles.map((profile) => {
          const active = selected.includes(profile.id);
          return <button key={profile.id} type="button" className={active ? "profile-card active" : "profile-card"} aria-pressed={active} onClick={() => toggleProfile(profile.id)}><span className="profile-icon" aria-hidden="true"><AccessIcon name={profile.icon} size={24} /></span><span><strong>{profile.label}</strong><small>{profile.short}</small></span><i aria-hidden="true">{active ? "✓" : "+"}</i></button>;
        })}
      </div>
      <p className="derived-note">‘걷기 불편’과 ‘임산부’는 무장애 API의 접근로·승강기·화장실 항목을 W.A.V.E 기준으로 조합한 필터입니다.</p>
      <details className="travel-profile-card">
        <summary><span><small>선택 사항 · 이 기기에만 저장</small><strong>편의 조건 저장·불러오기</strong></span><b aria-hidden="true">+</b></summary>
        <div className="travel-profile-content">
          {savedProfile ? <><p><b>저장한 조건</b> {savedProfiles.map((profile) => profile.label).join(" · ")}</p><div className="travel-profile-actions"><button type="button" onClick={applyTravelProfile}>저장한 조건 불러오기</button><button type="button" onClick={() => saveTravelProfile(selected)} disabled={!selected.length}>지금 선택으로 바꾸기</button><button type="button" className="delete" onClick={deleteTravelProfile}>저장 삭제</button></div></> : <><p>지금 고른 편의 조건을 다음 여행에서도 빠르게 불러올 수 있습니다.</p><div className="travel-profile-actions"><button type="button" onClick={() => saveTravelProfile(selected)} disabled={!selected.length}>이 조건 저장</button></div></>}
          <button type="button" className="travel-profile-clear" onClick={clearSelectedProfiles} disabled={!selected.length}>선택한 조건 모두 해제</button>
          <small className="travel-profile-privacy">선택한 편의 조건만 저장합니다. 건강 상태나 장애 유형을 추론하지 않습니다.</small>
        </div>
      </details>
      <p className="travel-profile-notice" role="status" aria-live="polite">{profileNotice}</p>
    </div>
    <div className="selection-bar" aria-live="polite">
      <div><span className="pulse-dot" aria-hidden="true" /><p><b>{activeProfiles.length ? `편의 조건 ${activeProfiles.length}개 선택` : "선택한 편의 조건 없음"}</b><span>{activeProfiles.length ? activeProfiles.map((item) => item.label).join(" · ") : "원하는 여행 조건을 골라주세요"}</span></p></div>
      <p className="auto-refresh-note">{loading ? <><span className="button-loader" /> 추천을 업데이트하고 있어요.</> : selected.length ? "조건을 바꾸면 추천이 자동으로 업데이트됩니다." : "편의 조건을 하나 이상 선택하면 추천을 시작합니다."}</p>
    </div>
    <p className="planner-notice" aria-live="polite">{notice}</p>
  </>;
}
