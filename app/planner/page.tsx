"use client";

import {
  useCallback,
  useMemo,
  useState,
} from "react";
import { useSitePreferences } from "../../components/SitePreferences";
import PlaceDecisionDialog from "../../features/planner/components/PlaceDecisionDialog";
import PlannerServiceStatus from "../../features/planner/components/PlannerServiceStatus";
import PlannerConditionsPanel from "../../features/planner/components/PlannerConditionsPanel";
import PlannerFooter from "../../features/planner/components/PlannerFooter";
import { PlannerHeader } from "../../features/planner/components/PlannerHeader";
import RecommendationWorkspace from "../../features/planner/components/RecommendationWorkspace";
import DepartureReadinessCard from "../../features/planner/components/DepartureReadinessCard";
import TravelSignalsPanel from "../../features/planner/components/TravelSignalsPanel";
import PlannerItineraryWorkspace from "../../features/planner/components/PlannerItineraryWorkspace";
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
  const { pointPicker, clearLocationSearch } = locationSearch;
  const { saved, orderedPlaceIds, travelStart, travelEnd, dayStartTime, scheduleAssignments, toggleSaved, savePlaceIds } = tripSelection;
  const saveMapPlaces = useCallback(
    (mapPlaces: { id: string }[]) => savePlaceIds(mapPlaces.map((place) => place.id)),
    [savePlaceIds],
  );
  const {
    keyHealth, keyHealthChecked, enrichment, enrichmentLoading, richMode, setRichMode,
    secondaryOpen, setSecondaryOpen,
    weather, weatherLoading, reloadWeather, loadEnrichment,
  } = usePlannerSignals({ plan, region, theme, locale, travelStart, travelEnd });
  const participation = usePlannerParticipation({
    plan,
    region,
    theme,
    profiles: selected,
    locale,
    travelStart,
    travelEnd,
    dayStartTime,
    scheduleAssignments,
    selectedPlaceIds: orderedPlaceIds,
    originLabel,
    selectedPlace,
  });
  const { feedbackText, feedbackState, changeFeedbackText, submitFeedback } = participation;
  const {
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
      loadInitialRoute: (places) => {
        const destination = places.find((place) => saved.includes(place.id)) || places[0];
        if (destination) void loadRoutes(destination);
      },
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
      <PlannerHeader t={t} scrolled={scrolled} hidden={headerHidden} savedCount={saved.length} />

      <section className="planner-journey-workspace" id="planner" aria-labelledby="journey-workspace-title">
        <header className="journey-workspace-hero" data-reveal>
          <div><p>W.A.V.E 여행 계획</p><h1 id="journey-workspace-title">나에게 맞는 여행을<br />4단계로 완성하세요.</h1></div>
          <p>조건을 고르고, 여행지를 일정에 추가한 뒤 이동 경로와 출발 전 정보만 확인하면 됩니다.</p>
          <nav aria-label="여행 계획 단계"><a href="#conditions">1 조건</a><a href="#places">2 여행지</a><a href="#itinerary">3 내 일정</a><a href="#departure-readiness">4 출발 전 확인</a></nav>
        </header>
        <PlannerConditionsPanel
          t={t}
          activePlaces={activePlaces}
          planController={planController}
          route={routePlanning}
          tripSelection={tripSelection}
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
        <PlannerItineraryWorkspace
          plan={plan}
          activePlaces={activePlaces}
          planCrowd={plan?.crowd}
          effectiveProviders={effectiveProviders}
          route={routePlanning}
          locationSearch={locationSearch}
          tripSelection={tripSelection}
          audioGuide={audioGuide}
          participation={participation}
          onChoosePoint={choosePoint}
          onCopyBookingRoute={copyBookingRoute}
          onMapDestination={routeFromMapPlace}
          onSaveMapPlaces={saveMapPlaces}
        />
        <DepartureReadinessCard
          plan={plan}
          region={region}
          weather={weather}
          weatherLoading={weatherLoading}
          transportProviders={effectiveProviders}
          tripSelection={tripSelection}
          participation={participation}
          onRefresh={() => { reloadWeather(); return generatePlan(false); }}
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
          secondaryOpen={secondaryOpen}
          onSecondaryOpenChange={setSecondaryOpen}
          onRouteFromRichSpot={routeFromRichSpot}
        />
        <PlannerServiceStatus
          locale={locale}
          keyHealth={keyHealth}
          effectiveProviders={effectiveProviders}
          transportProviders={transportProviders}
          providerErrors={providerErrors}
          liveCount={liveCount}
          dataErrors={dataErrors}
          plan={plan}
        />
      </section>

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

      <PlannerFooter />
    </main>
  );
}
