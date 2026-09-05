import { themes } from "../constants";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useTripSelection } from "../hooks/useTripSelection";
import { localDate } from "../utils";

export default function PlannerThemeDates({ t, planController, tripSelection, part = "all" }: {
  part?: "all" | "themes" | "dates";
  t: (key: string, fallback: string) => string;
  planController: ReturnType<typeof usePlannerPlan>;
  tripSelection: ReturnType<typeof useTripSelection>;
}) {
  const { themes: selectedThemes, toggleTheme } = planController;
  const { travelStart, travelEnd, changeTravelStart, changeTravelEnd } = tripSelection;
  return <>
    {part !== "dates" && <fieldset className="control-panel theme-control">
      <legend className="step-label">{t("enjoy", "무엇을 즐길까요?")}</legend>
      <p>여러 개를 함께 고를 수 있어요. 최소 하나를 유지해 주세요.</p>
      <div className="theme-grid">{themes.map((item) => <button key={item.id} type="button" className={selectedThemes.includes(item.id) ? "active" : ""} onClick={() => toggleTheme(item.id)} aria-pressed={selectedThemes.includes(item.id)}><span>{item.label}</span><small>{item.description}</small></button>)}</div>
    </fieldset>}
    {part !== "themes" && <div className="control-panel date-control">
      <span className="step-label">언제 떠날까요?</span>
      <div className="date-range-fields"><label><span>출발일</span><input type="date" min={localDate()} value={travelStart} onChange={(event) => changeTravelStart(event.target.value)} /></label><i aria-hidden="true">→</i><label><span>도착일</span><input type="date" min={travelStart} value={travelEnd} onChange={(event) => changeTravelEnd(event.target.value)} /></label></div>
      <p>최대 7일 일정과 해당 기간에 열리는 축제·행사를 함께 보여드려요.</p>
    </div>}
  </>;
}
