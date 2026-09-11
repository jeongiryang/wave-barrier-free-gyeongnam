import AccessIcon from "../../../components/AccessIcons";
import { profiles } from "../constants";
import { useSitePreferences } from "../../../components/SitePreferences";
import { englishProfiles } from "../condition-copy";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import { lazy, Suspense } from "react";
const AccountPreferences = lazy(() => import("../../account-travel/AccountPreferences"));

export default function PlannerAccessibilityProfiles({ t, planController }: {
  t: (key: string, fallback: string) => string;
  planController: ReturnType<typeof usePlannerPlan>;
}) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const profileCopy = (profile: typeof profiles[number]) => en ? englishProfiles[profile.id] : profile;
  const {
    selected, loading, notice, toggleProfile, clearSelectedProfiles,
    savedProfile, profileNotice, saveTravelProfile, deleteTravelProfile, applyTravelProfile,
  } = planController;
  const activeProfiles = profiles.filter((profile) => selected.includes(profile.id));
  const savedProfiles = profiles.filter((profile) => savedProfile?.selectedIds.includes(profile.id));
  return <>
    <div className="control-panel profile-panel">
      <div className="preference-label"><span className="step-label">{t("support", "어떤 편의가 필요할까요?")}</span><small>{en ? "Choose more than one" : "여러 개 선택 가능"}</small></div>
      <div className="profile-grid" role="group" aria-label={en ? "Required travel facilities" : "여행 편의 조건 선택"}>
        {profiles.map((profile) => {
          const active = selected.includes(profile.id);
          return <button key={profile.id} type="button" className={active ? "profile-card active" : "profile-card"} aria-pressed={active} onClick={() => toggleProfile(profile.id)}><span className="profile-icon" aria-hidden="true"><AccessIcon name={profile.icon} size={24} /></span><span><strong>{profileCopy(profile).label}</strong><small>{profileCopy(profile).short}</small></span><i aria-hidden="true">{active ? "✓" : "+"}</i></button>;
        })}
      </div>
      <p className="derived-note">{en ? "Facilities and access conditions vary by place. Check the details before your visit." : "장소마다 시설과 이용 조건이 다를 수 있어요. 방문 전 상세 정보를 확인해 주세요."}</p>
      <details className="travel-profile-card" suppressHydrationWarning>
        <summary><span><small>{en ? "Ready for your next trip" : "다음 여행에도 간편하게"}</small><strong>{en ? "Save and load facilities" : "편의 조건 저장·불러오기"}</strong></span><b aria-hidden="true">+</b></summary>
        <div className="travel-profile-content">
          {savedProfile ? <><p><b>{en ? "Saved facilities" : "저장한 조건"}</b> {savedProfiles.map((profile) => profileCopy(profile).label).join(" · ")}</p><div className="travel-profile-actions"><button type="button" onClick={applyTravelProfile}>{en ? "Load saved facilities" : "저장한 조건 불러오기"}</button><button type="button" onClick={() => saveTravelProfile(selected)} disabled={!selected.length}>{en ? "Replace with current choices" : "지금 선택으로 바꾸기"}</button><button type="button" className="delete" onClick={deleteTravelProfile}>{en ? "Delete saved facilities" : "저장 삭제"}</button></div></> : <><p>{en ? "Save your current facilities to load them quickly for another trip." : "지금 고른 편의 조건을 다음 여행에서도 빠르게 불러올 수 있습니다."}</p><div className="travel-profile-actions"><button type="button" onClick={() => saveTravelProfile(selected)} disabled={!selected.length}>{en ? "Save these facilities" : "이 조건 저장"}</button></div></>}
          <button type="button" className="travel-profile-clear" onClick={clearSelectedProfiles} disabled={!selected.length}>{en ? "Clear selected facilities" : "선택한 조건 모두 해제"}</button>
          <small className="travel-profile-privacy">{en ? "Only your selected facilities are saved. We do not infer health conditions or disability types." : "선택한 편의 조건만 저장합니다. 건강 상태나 장애 유형을 추론하지 않습니다."}</small>
          {!en && <Suspense fallback={<p role="status">계정 편의 조건을 준비하고 있어요.</p>}><AccountPreferences selected={selected} onApply={planController.setSelected} /></Suspense>}
        </div>
      </details>
      <p className="travel-profile-notice" role="status" aria-live="polite">{profileNotice}</p>
    </div>
    <div className="selection-bar" aria-live="polite">
      <div><span className="pulse-dot" aria-hidden="true" /><p><b>{activeProfiles.length ? en ? `${activeProfiles.length} facilities selected` : `편의 조건 ${activeProfiles.length}개 선택` : en ? "No facilities selected" : "선택한 편의 조건 없음"}</b><span>{activeProfiles.length ? activeProfiles.map((item) => profileCopy(item).label).join(" · ") : en ? "Choose your trip preferences" : "원하는 여행 조건을 골라주세요"}</span></p></div>
      <p className="auto-refresh-note">{loading ? <><span className="button-loader" /> {en ? "Finding places…" : "여행지를 찾고 있어요."}</> : selected.length ? en ? "Finish your choices, then select Find places." : "선택을 마치고 여행지 찾기를 눌러주세요." : en ? "Select at least one required facility." : "필요한 편의를 하나 이상 골라주세요."}</p>
    </div>
    <p className="planner-notice" aria-live="polite">{notice}</p>
  </>;
}
