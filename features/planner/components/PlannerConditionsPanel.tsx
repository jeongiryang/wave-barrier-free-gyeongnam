import AccessIcon from "../../../components/AccessIcons";
import { departurePresets, profiles, regions, themes } from "../constants";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";
import { localDate } from "../utils";

interface PlannerConditionsPanelProps {
  t: (key: string, fallback: string) => string;
  activePlaces: Place[];
  planController: ReturnType<typeof usePlannerPlan>;
  route: ReturnType<typeof useRoutePlanning>;
  tripSelection: ReturnType<typeof useTripSelection>;
  onGenerate: (revealResults?: boolean) => void | Promise<void>;
}

export default function PlannerConditionsPanel({
  t,
  activePlaces,
  planController,
  route,
  tripSelection,
  onGenerate,
}: PlannerConditionsPanelProps) {
  const {
    selected,
    region,
    setRegion,
    theme,
    setTheme,
    loading,
    notice,
    toggleProfile,
  } = planController;
  const { originLabel, updateOrigin, requestCurrentLocation, loadRoutes } = route;
  const { travelStart, travelEnd, changeTravelStart, setTravelEnd } = tripSelection;
  const activeProfiles = profiles.filter((profile) => selected.includes(profile.id));

  return <section className="planner-section" id="planner">
    <div className="workspace-heading" data-reveal>
      <div><span>01</span><h2>여행 조건</h2></div>
      <p>출발지 · 지역 · 테마 · 편의</p>
    </div>

    <div className="planner-bento" data-reveal>
      <div className="control-panel departure-control">
        <span className="step-label"><b>01</b> {t("startFrom", "어디서 출발할까요?")}</span>
        <div className="departure-row">
          <div className="select-shell"><i aria-hidden="true">◎</i><select value={departurePresets.find((item) => item.name === originLabel)?.id || "current"} onChange={(event) => {
            const preset = departurePresets.find((item) => item.id === event.target.value);
            if (!preset) return;
            updateOrigin(preset.point, preset.name);
            if (activePlaces[0]) void loadRoutes(activePlaces[0], preset.point, false, preset.name);
          }} aria-label="출발 거점 선택"><option value="current" disabled>{originLabel === "현재 위치" ? "현재 위치" : "출발 거점 선택"}</option>{departurePresets.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.detail}</option>)}</select><small>출발</small></div>
          <button type="button" onClick={requestCurrentLocation}>{t("currentLocation", "현재 위치")}</button>
        </div>
      </div>

      <label className="control-panel region-control">
        <span className="step-label"><b>02</b> {t("destination", "어디로 갈까요?")}</span>
        <div className="select-shell">
          <i aria-hidden="true">⌖</i>
          <select value={region} onChange={(event) => setRegion(event.target.value)} aria-label="여행 지역 선택">
            {regions.map((item) => <option key={item}>{item}</option>)}
          </select>
          <small>법정동 시도 48</small>
        </div>
      </label>

      <fieldset className="control-panel theme-control">
        <legend className="step-label"><b>03</b> {t("enjoy", "무엇을 즐길까요?")}</legend>
        <div className="theme-grid">
          {themes.map((item) => <button key={item.id} type="button" className={theme === item.id ? "active" : ""} onClick={() => setTheme(item.id)} aria-pressed={theme === item.id}>
            <span>{item.label}</span><small>{item.code}</small>
          </button>)}
        </div>
      </fieldset>

      <div className="control-panel date-control">
        <span className="step-label"><b>04</b> 언제 떠날까요?</span>
        <div className="date-range-fields">
          <label><span>출발일</span><input type="date" min={localDate()} value={travelStart} onChange={(event) => changeTravelStart(event.target.value)} /></label>
          <i aria-hidden="true">→</i>
          <label><span>도착일</span><input type="date" min={travelStart} value={travelEnd} onChange={(event) => setTravelEnd(event.target.value)} /></label>
        </div>
        <p>최대 7일 일정과 해당 기간에 열리는 축제·행사를 함께 보여드려요.</p>
      </div>

      <div className="control-panel profile-panel">
        <div className="preference-label"><span className="step-label"><b>05</b> {t("support", "어떤 편의가 필요할까요?")}</span><small>여러 개 선택 가능</small></div>
        <div className="profile-grid" role="group" aria-label="여행 편의 조건 선택">
          {profiles.map((profile) => {
            const active = selected.includes(profile.id);
            return <button key={profile.id} type="button" className={active ? "profile-card active" : "profile-card"} aria-pressed={active} onClick={() => toggleProfile(profile.id)}>
              <span className="profile-icon" aria-hidden="true"><AccessIcon name={profile.icon} size={24} /></span>
              <span><strong>{profile.label}</strong><small>{profile.short}</small></span>
              <i aria-hidden="true">{active ? "✓" : "+"}</i>
            </button>;
          })}
        </div>
        <p className="derived-note">‘걷기 불편’과 ‘임산부’는 무장애 API의 접근로·승강기·화장실 항목을 W.A.V.E 기준으로 조합한 필터입니다.</p>
      </div>

      <div className="selection-bar" aria-live="polite">
        <div><span className="pulse-dot" aria-hidden="true" /><p><b>{activeProfiles.length || "조건을"}개 선택</b><span>{activeProfiles.length ? activeProfiles.map((item) => item.label).join(" · ") : "원하는 여행 조건을 골라주세요"}</span></p></div>
        <button className="generate-button" type="button" onClick={() => void onGenerate(true)} disabled={!selected.length || loading}>
          {loading ? <><span className="button-loader" /> 자동 갱신 중</> : <>결과 새로고침 <span aria-hidden="true">↻</span></>}
        </button>
      </div>
      <p className="planner-notice" aria-live="polite">{notice}</p>
    </div>
  </section>;
}
