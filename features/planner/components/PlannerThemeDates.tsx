import { themes } from "../constants";
import { useSitePreferences } from "../../../components/SitePreferences";
import { englishThemes } from "../condition-copy";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useTripSelection } from "../hooks/useTripSelection";
import { localDate } from "../utils";
import TripDateNotice from "./TripDateNotice";

export default function PlannerThemeDates({ t, planController, tripSelection, part = "all" }: {
  part?: "all" | "themes" | "dates";
  t: (key: string, fallback: string) => string;
  planController: ReturnType<typeof usePlannerPlan>;
  tripSelection: ReturnType<typeof useTripSelection>;
}) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const { themes: selectedThemes, toggleTheme } = planController;
  const { travelStart, travelEnd, changeTravelStart, changeTravelEnd } = tripSelection;
  return <>
    {part !== "dates" && <fieldset className="control-panel theme-control">
      <legend className="step-label">{t("enjoy", "무엇을 하고 싶나요?")}</legend>
      <p>{en ? "You can choose more than one." : "여러 개 골라도 괜찮아요."}</p>
      <div className="theme-grid">{themes.map((item) => <button key={item.id} type="button" className={selectedThemes.includes(item.id) ? "active" : ""} onClick={() => toggleTheme(item.id)} aria-pressed={selectedThemes.includes(item.id)}><span>{en ? englishThemes[item.id].label : item.label}</span><small>{en ? englishThemes[item.id].description : item.description}</small></button>)}</div>
      <button type="button" className="theme-any" onClick={() => planController.setTheme(themes.map(item => item.id).join(','))} aria-pressed={selectedThemes.length === themes.length}>{en ? 'Open to anything · choose all' : '아직 못 정했어요 · 모두 살펴보기'}</button>
    </fieldset>}
    {part !== "themes" && <div className="control-panel date-control">
      <span className="step-label">{en ? "When are you travelling?" : "언제 떠날까요?"}</span>
      <div className="date-range-fields"><label><span>{en ? "Start date" : "출발일"}</span><input type="date" min={tripSelection.storageReady ? localDate() : undefined} value={travelStart} aria-describedby="condition-date-notice" onChange={(event) => changeTravelStart(event.target.value)} /></label><i aria-hidden="true">→</i><label><span>{en ? "End date" : "도착일"}</span><input type="date" min={travelStart} max={tripSelection.lastTravelDate} value={travelEnd} aria-describedby="condition-date-notice" onChange={(event) => changeTravelEnd(event.target.value)} /></label></div>
      <TripDateNotice id="condition-date-notice" notice={tripSelection.dateNotice} />
      <p>{en ? "Plan up to seven days and see festivals and events during your trip." : "최대 7일 일정과 해당 기간에 열리는 축제·행사를 함께 보여드려요."}</p>
    </div>}
  </>;
}
