import { themes } from "../constants";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useTripSelection } from "../hooks/useTripSelection";
import { localDate } from "../utils";

export default function PlannerThemeDates({ t, planController, tripSelection }: {
  t: (key: string, fallback: string) => string;
  planController: ReturnType<typeof usePlannerPlan>;
  tripSelection: ReturnType<typeof useTripSelection>;
}) {
  const { theme, setTheme } = planController;
  const { travelStart, travelEnd, changeTravelStart, changeTravelEnd } = tripSelection;
  return <>
    <fieldset className="control-panel theme-control">
      <legend className="step-label">{t("enjoy", "무엇을 즐길까요?")}</legend>
      <div className="theme-grid">{themes.map((item) => <button key={item.id} type="button" className={theme === item.id ? "active" : ""} onClick={() => setTheme(item.id)} aria-pressed={theme === item.id}><span>{item.label}</span><small>{item.description}</small></button>)}</div>
    </fieldset>
    <div className="control-panel date-control">
      <span className="step-label">언제 떠날까요?</span>
      <div className="date-range-fields"><label><span>출발일</span><input type="date" min={localDate()} value={travelStart} onChange={(event) => changeTravelStart(event.target.value)} /></label><i aria-hidden="true">→</i><label><span>도착일</span><input type="date" min={travelStart} value={travelEnd} onChange={(event) => changeTravelEnd(event.target.value)} /></label></div>
      <p>최대 7일 일정과 해당 기간에 열리는 축제·행사를 함께 보여드려요.</p>
    </div>
  </>;
}
