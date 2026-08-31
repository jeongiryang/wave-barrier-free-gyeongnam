import AccessIcon from "../../../components/AccessIcons";
import { profiles } from "../constants";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";

export default function PlannerAccessibilityProfiles({ t, planController, onGenerate }: {
  t: (key: string, fallback: string) => string;
  planController: ReturnType<typeof usePlannerPlan>;
  onGenerate: (revealResults?: boolean) => void | Promise<void>;
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
      <section className="travel-profile-card" aria-labelledby="travel-profile-title">
        <header><div><small>이 기기에만 저장</small><h3 id="travel-profile-title">나의 무장애 여행 프로필</h3></div>{savedProfile && <time dateTime={new Date(savedProfile.updatedAt).toISOString()}>최근 저장 {new Date(savedProfile.updatedAt).toLocaleDateString("ko-KR")}</time>}</header>
        {savedProfile ? <><p>{savedProfiles.map((profile) => profile.label).join(" · ")}</p><div className="travel-profile-actions"><button type="button" onClick={applyTravelProfile}>저장 프로필 적용</button><button type="button" onClick={() => saveTravelProfile(selected)} disabled={!selected.length}>현재 선택으로 덮어쓰기</button><button type="button" className="delete" onClick={deleteTravelProfile}>저장 프로필 삭제</button></div></> : <><p>지금 고른 편의조건을 다음 여행에서 다시 불러올 수 있습니다.</p><div className="travel-profile-actions"><button type="button" onClick={() => saveTravelProfile(selected)} disabled={!selected.length}>현재 선택 저장</button></div></>}
        <button type="button" className="travel-profile-clear" onClick={clearSelectedProfiles} disabled={!selected.length}>현재 선택 전체 해제</button>
        <small className="travel-profile-privacy">사용자가 고른 편의조건 ID만 저장합니다. 진단명·계정 정보·위치는 저장하거나 추론하지 않습니다.</small>
        <p className="travel-profile-notice" role="status" aria-live="polite">{profileNotice}</p>
      </section>
    </div>
    <div className="selection-bar" aria-live="polite">
      <div><span className="pulse-dot" aria-hidden="true" /><p><b>{activeProfiles.length ? `편의 조건 ${activeProfiles.length}개 선택` : "선택한 편의 조건 없음"}</b><span>{activeProfiles.length ? activeProfiles.map((item) => item.label).join(" · ") : "원하는 여행 조건을 골라주세요"}</span></p></div>
      <button className="generate-button" type="button" onClick={() => void onGenerate(true)} disabled={!selected.length || loading}>{loading ? <><span className="button-loader" /> 여행지 찾는 중</> : <>여행지 다시 찾기 <span aria-hidden="true">↻</span></>}</button>
    </div>
    <p className="planner-notice" aria-live="polite">{notice}</p>
  </>;
}
