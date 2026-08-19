"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import {
  useCallback,
  useMemo,
  useState,
} from "react";
import { PreferenceControls, useSitePreferences } from "../../components/SitePreferences";
import HelpCenter from "../../components/HelpCenter";
import GithubFooterLink from "../../components/GithubFooterLink";
import AccountMenu from "../../features/auth/components/AccountMenu";
import PlaceDecisionDialog from "../../features/planner/components/PlaceDecisionDialog";
import NavigationWorkspace from "../../features/planner/components/NavigationWorkspace";
import PlannerServiceStatus from "../../features/planner/components/PlannerServiceStatus";
import PlannerConditionsPanel from "../../features/planner/components/PlannerConditionsPanel";
import PlannerResultsPanel from "../../features/planner/components/PlannerResultsPanel";
import RecommendationWorkspace from "../../features/planner/components/RecommendationWorkspace";
import TravelSignalsPanel from "../../features/planner/components/TravelSignalsPanel";
import { useAudioGuide } from "../../features/planner/hooks/useAudioGuide";
import { useLocationSearch } from "../../features/planner/hooks/useLocationSearch";
import { usePlannerChrome } from "../../features/planner/hooks/usePlannerChrome";
import { usePlannerParticipation } from "../../features/planner/hooks/usePlannerParticipation";
import { usePlannerPlan } from "../../features/planner/hooks/usePlannerPlan";
import { usePlannerSignals } from "../../features/planner/hooks/usePlannerSignals";
import { usePlannerActions } from "../../features/planner/hooks/usePlannerActions";
import { usePlaceDialogFocus } from "../../features/planner/hooks/usePlaceDialogFocus";
import { usePlannerAutoRefresh } from "../../features/planner/hooks/usePlannerAutoRefresh";
import { useRoutePlanning } from "../../features/planner/hooks/useRoutePlanning";
import { useTripSelection } from "../../features/planner/hooks/useTripSelection";
import type { Place } from "../../features/planner/types";
import { buildPlannerViewModel } from "../../features/planner/view-model";

export default function PlannerPage() {
  const { locale, t } = useSitePreferences();
  const planController = usePlannerPlan(locale);
  const {
    selected, region, theme, setTheme, plan,
    setNotice, runPlan, abortPlan,
  } = planController;
  const routePlanning = useRoutePlanning(region);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const closeSelectedPlace = useCallback(() => setSelectedPlace(null), []);
  const placeDialogRef = usePlaceDialogFocus(Boolean(selectedPlace), closeSelectedPlace);

  const activePlaces = useMemo(() => plan?.places ?? [], [plan]);
  const { headerHidden, scrolled } = usePlannerChrome(plan);
  const {
    origin, originLabel, privateOrigin, routeDestination,
    destinationCrowd, transportProviders,
    loadRoutes, resetRouteData, setRouteNotice, updateOrigin,
  } = routePlanning;
  const tripSelection = useTripSelection({ activePlaces, origin, accessibilityProfileCount: selected.length });
  const locationSearch = useLocationSearch(region);
  const audioGuide = useAudioGuide(plan?.audio);
  const { resetAudio } = audioGuide;
  const {
    pointPicker, clearLocationSearch,
  } = locationSearch;
  const {
    saved, travelStart, travelEnd, scheduleAssignments, toggleSaved,
  } = tripSelection;
  const {
    keyHealth, keyHealthChecked, enrichment, enrichmentLoading, richMode, setRichMode,
    weather, weatherLoading, loadEnrichment,
  } = usePlannerSignals({ plan, region, theme, locale, travelStart, travelEnd });
  const participation = usePlannerParticipation({
    plan,
    region,
    theme,
    profiles: selected,
    locale,
    travelStart,
    travelEnd,
    scheduleAssignments,
    selectedPlaceIds: saved,
    originLabel,
    selectedPlace,
  });
  const {
    feedbackText, feedbackState, changeFeedbackText, submitFeedback,
  } = participation;
  const {
    statuses,
    liveCount,
    effectiveProviders,
    providerErrors,
    dataErrors,
    richItems,
    visitorTypes,
    demandMax,
    impactAlternative,
    impactCrowd,
    tripImpact,
  } = buildPlannerViewModel({
    plan,
    enrichment,
    richMode,
    weather,
    travelStart,
    theme,
    activePlaces,
    routeDestination,
    destinationCrowd,
    transportProviders,
    keyHealth,
    keyHealthChecked,
  });
  const { choosePoint, routeFromRichSpot, routeFromMapPlace, applyImpactAction, copyBookingRoute } = usePlannerActions({
    region,
    origin,
    originLabel,
    privateOrigin,
    pointPicker,
    routeDestination,
    activePlaces,
    impactAlternative,
    updateOrigin,
    loadRoutes,
    clearLocationSearch,
    setTheme,
    setNotice,
    setRouteNotice,
  });

  async function generatePlan(revealResults = true) {
    await runPlan({
      resetRouteData,
      resetAudio,
      loadFirstRoute: (place) => void loadRoutes(place),
    }, revealResults);
  }

  usePlannerAutoRefresh({
    enabled: selected.length > 0,
    signature: `${region}|${theme}|${locale}|${selected.join(",")}`,
    refresh: generatePlan,
    abort: abortPlan,
  });

  return (
    <main className="planner-page">
      <a className="skip-link" href="#planner">{t("skip", "본문으로 바로가기")}</a>
      <div className="scroll-progress" aria-hidden="true" />
      <header className={`site-header ${scrolled ? "scrolled" : ""} ${headerHidden ? "hidden" : ""}`}>
        <a className="brand" href="/" aria-label="W.A.V.E 소개 홈">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>W.A.V.E</span>
        </a>
        <nav aria-label="주요 메뉴">
          <a href="#planner">{t("conditions", "여행 조건")}</a>
          <a href="#navigation">{t("route", "길찾기")}</a>
          <a href="#data">{t("evidence", "추천 근거")}</a>
          <a href="/community">커뮤니티</a>
        </nav>
        <div className="planner-header-actions"><HelpCenter /><PreferenceControls /><AccountMenu loginHref="/login?next=%2Fplanner" /><button className="header-action" type="button" onClick={() => document.getElementById("places")?.scrollIntoView({ behavior: "smooth" })}>
          여행 보관함 <b>{saved.length}</b><span aria-hidden="true">↗</span>
        </button></div>
      </header>

      <PlannerServiceStatus
        locale={locale}
        open={diagnosticsOpen}
        onToggle={() => setDiagnosticsOpen((open) => !open)}
        keyHealth={keyHealth}
        effectiveProviders={effectiveProviders}
        transportProviders={transportProviders}
        providerErrors={providerErrors}
        liveCount={liveCount}
        dataErrors={dataErrors}
        plan={plan}
      />

      <PlannerConditionsPanel
        t={t}
        activePlaces={activePlaces}
        planController={planController}
        route={routePlanning}
        tripSelection={tripSelection}
        onGenerate={generatePlan}
      />
      <RecommendationWorkspace
        t={t}
        region={region}
        activePlaces={activePlaces}
        planController={planController}
        route={routePlanning}
        tripSelection={tripSelection}
        onGenerate={generatePlan}
        onSelectPlace={setSelectedPlace}
      />
      <TravelSignalsPanel
        region={region}
        plan={plan}
        weather={weather}
        weatherLoading={weatherLoading}
        tripImpact={tripImpact}
        impactCrowd={impactCrowd}
        onImpactAction={applyImpactAction}
        enrichment={enrichment}
        enrichmentLoading={enrichmentLoading}
        visitorTypes={visitorTypes}
        demandMax={demandMax}
        richMode={richMode}
        onRichModeChange={setRichMode}
        richItems={richItems}
        onReloadEnrichment={() => void loadEnrichment()}
        onRouteFromRichSpot={routeFromRichSpot}
      />
      <NavigationWorkspace
        t={t}
        activePlaces={activePlaces}
        planCrowd={plan?.crowd}
        effectiveProviders={effectiveProviders}
        route={routePlanning}
        locationSearch={locationSearch}
        onChoosePoint={choosePoint}
        onCopyBookingRoute={copyBookingRoute}
        onMapDestination={routeFromMapPlace}
      />
      <PlannerResultsPanel
        plan={plan}
        region={region}
        theme={theme}
        selectedProfileIds={selected}
        statuses={statuses}
        liveCount={liveCount}
        audioGuide={audioGuide}
        participation={participation}
      />
      {selectedPlace && <PlaceDecisionDialog
        place={selectedPlace}
        region={region}
        saved={saved.includes(selectedPlace.id)}
        feedbackText={feedbackText}
        feedbackState={feedbackState}
        dialogRef={placeDialogRef}
        onClose={closeSelectedPlace}
        onToggleSaved={() => { toggleSaved(selectedPlace.id); setSelectedPlace(null); }}
        onFeedbackChange={changeFeedbackText}
        onSubmitFeedback={() => void submitFeedback()}
      />}

      <footer className="simple-footer">
        <div className="brand footer-brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></div>
        <div className="footer-notes"><p>누구나 원하는 곳으로, 경남 무장애 여행 길잡이</p><p className="trust-notice">2026 관광데이터 활용 공모전 ②-2 웹·앱 구현 부문 · 지정과제 1 출품용 독립 서비스이며 한국관광공사·경상남도의 공식 운영 서비스가 아닙니다.</p></div>
        <div className="footer-meta"><p className="source">출처: ⓒ한국관광공사 · ⓒ한국관광콘텐츠랩</p><GithubFooterLink /></div>
      </footer>
    </main>
  );
}
