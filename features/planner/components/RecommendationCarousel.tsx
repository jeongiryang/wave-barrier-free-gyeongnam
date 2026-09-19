"use client";

import { lazy, Suspense, useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import { Spinner } from "../../../components/LoadingState";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";
import { providerFailureMessage } from "../../../lib/provider-failure.js";
import { facilityLabel } from "../../../lib/facility-selection.js";
import { planFailureHeadings } from "../condition-copy";
import PlaceResultRow from "./PlaceResultRow";
import PlaceComparison from "./PlaceComparison";
const ExplorationPlaces = lazy(() => import("./ExplorationPlaces"));

export default function RecommendationCarousel({ region, activePlaces, planController: control, tripSelection: trip, onGenerate, onMore, onSelectPlace }: {
  region: string; activePlaces: Place[]; planController: ReturnType<typeof usePlannerPlan>; tripSelection: ReturnType<typeof useTripSelection>;
  onGenerate: (revealResults?: boolean, requestedTheme?: string) => void | Promise<void>;
  onMore?: () => void | Promise<void>; onSelectPlace: (place: Place) => void;
}) {
  const en = useSitePreferences().locale === "en";
  const say = (ko: string, english: string) => en ? english : ko;
  const { loading, planError, plan, dirty, resultCurrent } = control;
  const exploration = plan?.explorationPlaces || [];
  const excluded = plan?.excludedPlaces || [];
  const [showUnknown, setShowUnknown] = useState(false);
  const [unknownDraft, setUnknownDraft] = useState(false);
  const [allActivitiesDraft, setAllActivitiesDraft] = useState(false);
  const providerFailures = [...new Map((plan?.statuses || []).filter(status => ['tour', 'barrierfree'].includes(status.id))
    .flatMap(status => [...(status.failure ? [status.failure] : []), ...(status.failures || [])]).map(failure => [failure.kind, failure])).values()];
  const incomplete = plan?.statuses.some(status => ["tour", "barrierfree"].includes(status.id) && (status.state === "error" || status.partial));
  const needsHelp = Boolean(plan && resultCurrent && !loading && !planError && !incomplete && activePlaces.length < 3
    && (exploration.length > 0 || (control.themes.length > 0 && control.themes.length < 4)));
  async function applySuggestions() {
    if (unknownDraft) setShowUnknown(true);
    if (allActivitiesDraft) {
      control.setTheme("");
      await onGenerate(false, "");
    }
  }
  return <section className="simple-results" aria-label={say("여행지 검색 결과", "Place search results")} aria-busy={loading}>
    <div className="simple-results-heading"><h2>{region} {say("여행지", "places")}</h2>{plan && <span>{say(`불러온 장소 ${activePlaces.length + exploration.length + excluded.length}곳`, `${activePlaces.length + exploration.length + excluded.length} places loaded`)}</span>}</div>
    {planError ? <div className="simple-result-notice" role="alert"><p>{planFailureHeadings[planError][en ? 1 : 0]}</p><div><button type="button" disabled={loading} onClick={() => void onGenerate(false)}>{say("같은 조건으로 다시 시도", "Retry with these preferences")}</button>{control.recentPlan && <button type="button" onClick={control.useRecentPlan}>{say('최근 확인 결과 보기', 'View last checked results')}</button>}</div>{control.recentPlan && <small>{say(`${new Date(control.recentPlan.checkedAt).toLocaleString('ko-KR')}에 확인한 ${control.recentPlan.source} 결과입니다. 현재 결과가 아닙니다.`, `Checked ${new Date(control.recentPlan.checkedAt).toLocaleString('en')} from ${control.recentPlan.source}. This is not live data.`)}</small>}</div>
      : incomplete && <div className="simple-result-notice" role="status"><p>{providerFailures.length ? providerFailures.map(failure => providerFailureMessage(failure, en)).join(" ") : say("일부 장소 정보를 불러오지 못했어요.", "Some place information could not be loaded.")}</p><button type="button" disabled={loading} onClick={() => void onGenerate(false)}>{say("다시 시도", "Retry")}</button></div>}
    {(planError || incomplete) && <p className="simple-recovery-links">조건은 그대로 유지됩니다. <a href="/travel-book">저장한 여행 보기</a> · <a href="/guide#planner-guide">검색 도움말</a></p>}
    {control.usingRecent && <div className="simple-result-notice" role="status"><p>{say('현재 조회가 실패해 사용자가 선택한 최근 확인 결과를 표시합니다.', 'The live request failed. Showing the last checked result you selected.')}</p><small>{new Date(control.usingRecent.checkedAt).toLocaleString(en ? 'en' : 'ko-KR')} · {control.usingRecent.source}</small></div>}
    {loading && <p className="simple-search-progress" role="status"><Spinner />{say("여행지를 찾고 있어요.", "Finding places.")}</p>}
    {dirty && !loading && !planError && <div className="simple-result-notice" role="status"><p>{say("아래는 이전 조건의 결과예요.", "These results use your previous preferences.")}</p><button type="button" onClick={() => void onGenerate(false)}>{say("현재 조건으로 다시 찾기", "Search current preferences")}</button></div>}
    {loading && !plan && <div className="simple-place-list" aria-hidden="true">{[0, 1, 2].map(id => <div className="simple-place-skeleton" key={id}><i /><div><b /><span /><span /></div></div>)}</div>}
    {plan && !loading && !activePlaces.length && !planError && !incomplete && <p className="simple-empty" role="status">{control.selected.length ? say("선택한 편의가 모두 확인된 장소를 찾지 못했어요.", "No loaded places report all your required facilities.") : say("이 조건으로 불러온 장소가 없어요.", "No places were returned for these preferences.")}</p>}
    {needsHelp && <section className="simple-condition-help" aria-labelledby="condition-help-title">
      <div><h3 id="condition-help-title">{say("조건을 직접 조정하면 더 볼 수 있어요", "Adjust only the conditions you choose")}</h3><p>{say("선택한 항목만 적용되며 WAVE가 조건을 임의로 바꾸지 않아요", "WAVE never changes your requirements without your approval")}</p></div>
      <fieldset><legend className="sr-only">{say("추가 장소를 보기 위한 조건 조정", "Adjust conditions to see more places")}</legend>
        {exploration.length > 0 && <label><input type="checkbox" checked={unknownDraft} onChange={event => setUnknownDraft(event.target.checked)} /><span><b>{say("필요한 편의가 미확인인 장소 포함", "Include places with unconfirmed facilities")}</b><small>{say(`${exploration.length}곳 추가 · 미확인 항목은 장소에 직접 확인`, `${exploration.length} more · confirm missing details with the place`)}</small></span></label>}
        {control.themes.length > 0 && control.themes.length < 4 && <label><input type="checkbox" checked={allActivitiesDraft} onChange={event => setAllActivitiesDraft(event.target.checked)} /><span><b>{say("모든 활동으로 검색 범위 넓히기", "Expand to all activities")}</b><small>{say("필요한 편의는 유지하고 추가 결과 수를 다시 확인", "Keep required facilities and check the new result count")}</small></span></label>}
      </fieldset>
      <button type="button" disabled={!unknownDraft && !allActivitiesDraft} onClick={() => void applySuggestions()}>{say("선택한 조건 적용", "Apply selected changes")}</button>
    </section>}
    {plan && !loading && !planError && !incomplete && !activePlaces.length && <button type="button" className="simple-text-link" onClick={() => void onGenerate(false)}>{say('같은 조건으로 다시 시도', 'Retry with these preferences')}</button>}
    {trip.commandNotice && <p className="simple-command-receipt" role="status">{trip.commandNotice}{trip.canUndoCommand && <button type="button" onClick={() => trip.undoCommand()}>되돌리기</button>}</p>}
    <PlaceComparison places={activePlaces} requiredKeys={plan?.criteria?.facilityKeys || []} saved={trip.saved} current={resultCurrent} en={en} onReviewSearch={() => { const input = document.querySelector<HTMLSelectElement>('.simple-search-bar select'); input?.scrollIntoView({ block: 'center' }); input?.focus({ preventScroll: true }); }} onToggle={place => trip.toggleSaved(place.id)}>{compare => <div className="simple-place-list">
      {activePlaces.map(place => <PlaceResultRow key={place.id} place={place} region={region} en={en} saved={trip.saved.includes(place.id)} current={resultCurrent} onToggle={() => trip.toggleSaved(place.id)} onDetails={() => onSelectPlace(place)} compare={compare.active ? { selected: compare.ids.includes(place.id), disabled: !compare.ids.includes(place.id) && compare.ids.length >= 3, toggle: () => compare.toggle(place.id) } : undefined} />)}
    </div>}</PlaceComparison>
    {exploration.length > 0 && (!needsHelp || showUnknown) && <Suspense fallback={<p><Spinner />{say("다른 장소를 불러오고 있어요.", "Loading other places.")}</p>}><ExplorationPlaces places={exploration} region={region} saved={trip.saved} en={en} onToggle={place => trip.toggleSaved(place.id, place)} onSelectPlace={onSelectPlace} /></Suspense>}
    {excluded.length > 0 && <details className="simple-excluded"><summary>{say(`선택한 시설이 없어 제외된 장소 ${excluded.length}곳`, `${excluded.length} places excluded for unavailable facilities`)}</summary>
      <ul>{excluded.map(place => <li key={place.id}><button type="button" className="simple-text-link" onClick={() => onSelectPlace(place)}>{place.name}</button><p>{place.accessibility?.filter(item => item.state === 'negative' && (plan?.criteria?.facilityKeys || control.selected).includes(item.key)).map(item => `${facilityLabel(item.key, en)} ${say('없음', 'unavailable')}`).join(' · ')}</p></li>)}</ul>
    </details>}
    {plan?.pagination?.hasMore && onMore && <button type="button" className="simple-load-more" disabled={loading || dirty} onClick={() => void onMore()}>{loading ? <Spinner /> : null}{say("장소 더 보기", "Load more places")}</button>}
  </section>;
}
