"use client";

import {
  useCallback,
  useMemo,
  useState,
} from "react";
import { useSitePreferences } from "../../components/SitePreferences";
import SkipLink from "../../components/SkipLink";
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
import { useRoutePlanning } from "../../features/planner/hooks/useRoutePlanning";
import { useTripSelection } from "../../features/planner/hooks/useTripSelection";
import { useItineraryRoutes } from "../../features/planner/hooks/useItineraryRoutes";
import { useJourneyProgress } from "../../features/planner/hooks/useJourneyProgress";
import type { Place } from "../../features/planner/types";
import { buildPlannerViewModel } from "../../features/planner/view-model";
import PlannerJourneyRail from "../../features/planner/components/PlannerJourneyRail";
import PlannerJourneyModeToggle from "../../features/planner/components/PlannerJourneyModeToggle";
import PlannerStageFrame from "../../features/planner/components/PlannerStageFrame";
import { usePlannerStageView } from "../../features/planner/hooks/usePlannerStageView";
import { profiles as accessibilityProfiles, themes as travelThemes } from "../../features/planner/constants";

export default function PlannerPage() {
  const { hydrated, locale, motion, t } = useSitePreferences();
  const planController = usePlannerPlan(locale);
  const {
    selected, region, theme, setTheme, plan,
    setNotice, runPlan,
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
  const itineraryRoutes = useItineraryRoutes(tripSelection, routePlanning);
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
  const stageView = usePlannerStageView();
  const [reviewedTrip, setReviewedTrip] = useState("");
  const [reviewedItinerary, setReviewedItinerary] = useState("");
  const itinerarySignature = JSON.stringify([itineraryRoutes.signature, routePlanning.routeTravelMode, dayStartTime]);
  const itineraryReviewed = reviewedItinerary === itinerarySignature && itineraryRoutes.complete && !itineraryRoutes.loading;
  const reviewSignature = JSON.stringify([region, theme, selected, orderedPlaceIds, travelStart, travelEnd, scheduleAssignments, origin, routePlanning.activeRoute?.id, dayStartTime, itinerarySignature, weather?.updatedAt]);
  const journey = useJourneyProgress({
    searched: planController.resultCurrent,
    reviewed: reviewedTrip === reviewSignature,
    itineraryReviewed,
    motion,
    observeSections: stageView.view === "overview",
    activeStepId: stageView.activeStepId,
    onActiveStepChange: stageView.changeStep,
    selectedProfileCount: selected.length,
    recommendedCount: activePlaces.length,
    // A new search must not become the gate for an itinerary that already
    // exists on this device.  Use the resolved catalogue, not the current
    // recommendation response, so returning users can continue their trip.
    savedCount: tripSelection.orderedSavedPlaces.length,
    // Device storage unlocks editing; only a saved current recommendation
    // contributes to preparation completion for the selected conditions.
    currentSavedCount: planController.resultCurrent ? activePlaces.filter((place) => saved.includes(place.id)).length : 0,
    routeDestinationName: routeDestination?.name || "",
    weatherReady: Boolean(weather && !weatherLoading),
  });
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
    savedPlaceIds: saved,
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
    onCultureSearch: async () => {
      if (planController.loading) return;
      setTheme("history");
      stageView.changeStep("conditions");
      const success = await runPlan({ resetRouteData, resetAudio, requestedTheme: "history" });
      if (success) stageView.changeStep("places");
    },
    onSelectDestination: (place) => {
      if (!saved.includes(place.id)) {
        if (!window.confirm(locale === "en" ? `Add ${place.name} to ${tripSelection.activeDay} and check the route? Facility access still needs verification.` : `${place.name}을(를) ${tripSelection.activeDay} 일정에 추가하고 경로를 확인할까요? 편의시설 정보는 별도로 확인해야 합니다.`)) return false;
        toggleSaved(place.id, place);
        tripSelection.assignPlaceToDay(place.id, tripSelection.activeDay);
      } else {
        const day = scheduleAssignments[place.id] || tripSelection.tripDays[0];
        if (!tripSelection.tripDays.includes(day)) {
          setNotice(locale === "en" ? "This place is stored outside the trip dates. Move it into this trip first." : "이 장소는 현재 여행 기간 밖에 보관되어 있습니다. 일정에서 날짜를 먼저 옮겨주세요.");
          return false;
        }
        tripSelection.setActiveDay(day);
      }
      stageView.changeStep("itinerary");
      return true;
    },
    onReplaceAlternative: () => {
      const target = tripSelection.orderedSavedPlaces.find((place) => (scheduleAssignments[place.id] || tripSelection.tripDays[0]) === tripSelection.activeDay);
      if (!target || !impactAlternative || !planController.resultCurrent) return;
      const message = locale === "en"
        ? `Replace ${target.name} with ${impactAlternative.name}? The date and order will stay the same. Lower crowd levels and accessibility are not confirmed for this alternative; check its facility information before visiting.`
        : `${target.name} 대신 ${impactAlternative.name}을 일정에 넣을까요? 날짜와 순서는 유지합니다. 대안의 혼잡도와 이동 편의가 더 낫다는 뜻은 아니므로 방문 전에 시설 정보를 확인해 주세요.`;
      if (!window.confirm(message)) return;
      if (tripSelection.replaceSavedPlace(target.id, impactAlternative)) {
        resetRouteData();
        setNotice(locale === "en" ? "Place replaced. Check the updated itinerary and route." : "선택한 장소로 바꿨어요. 갱신된 일정과 경로를 확인해 주세요.");
        stageView.changeStep("itinerary");
      }
    },
    updateOrigin,
    loadRoutes,
    clearLocationSearch,
    setRouteNotice,
  });

  async function generatePlan(revealResults = true) {
    const success = await runPlan({
      resetRouteData,
      resetAudio,
    }, revealResults);
    if (success && revealResults) stageView.changeStep("places");
  }

  return (
    <main className="planner-page">
      <SkipLink href="#planner">{t("skip", "본문으로 바로가기")}</SkipLink>
      <div className="scroll-progress" aria-hidden="true" />
      <PlannerHeader t={t} scrolled={scrolled} hidden={headerHidden} savedCount={saved.length} onNavigate={journey.goToStep} />

      <section className="planner-journey-workspace" id="planner" aria-labelledby="journey-workspace-title">
        <header className="planner-intro">
          <div><h1 id="journey-workspace-title">{locale === "en" ? "A trip that works for you." : "나에게 맞는 경남 여행"}</h1>
          <p>{locale === "en" ? "Choose your needs. Check the evidence. Make the final choice." : "필요한 편의를 고르고, 확인된 정보를 보고, 직접 선택하세요."}</p>
          <p className="planner-progress-status" role="status">{locale === "en" ? `${journey.completedCount} of 4 steps complete · ${4 - journey.completedCount} remaining` : `4단계 중 ${journey.completedCount}단계 완료 · ${4 - journey.completedCount}단계 남음`}</p></div>
          <PlannerJourneyModeToggle view={stageView.view} interactive={hydrated} onChange={stageView.changeView} />
        </header>
        <div className="journey-control-layout">
          <PlannerJourneyRail
            journey={journey}
            interactive={hydrated}
            selectedProfileCount={selected.length}
            recommendedCount={activePlaces.length}
            savedCount={saved.length}
            routeDestinationName={routeDestination?.name || ""}
          />
          <div className="journey-stage-stream" data-view={stageView.view}>
            <PlannerStageFrame view={stageView.view} step={journey.steps[0]} steps={journey.steps} activeStepId={journey.activeStepId} interactive={hydrated} onStepChange={journey.goToStep} onShowOverview={() => stageView.changeView("overview")}>
              <PlannerConditionsPanel
                view={stageView.view}
                onGenerate={generatePlan}
                t={t}
                activePlaces={activePlaces}
                planController={planController}
                route={routePlanning}
                tripSelection={tripSelection}
              />
            </PlannerStageFrame>
            <PlannerStageFrame view={stageView.view} step={journey.steps[1]} steps={journey.steps} activeStepId={journey.activeStepId} interactive={hydrated} onStepChange={journey.goToStep} onShowOverview={() => stageView.changeView("overview")}>
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
            </PlannerStageFrame>
            <PlannerStageFrame view={stageView.view} step={journey.steps[2]} steps={journey.steps} activeStepId={journey.activeStepId} interactive={hydrated} onStepChange={journey.goToStep} onShowOverview={() => stageView.changeView("overview")}>
              <PlannerItineraryWorkspace
                coverage={itineraryRoutes}
                reviewed={itineraryReviewed}
                onReview={(checked) => setReviewedItinerary(checked ? itinerarySignature : "")}
                mapEnabled={stageView.view === "overview" || journey.activeStepId === "itinerary"}
                plan={plan}
                activePlaces={activePlaces}
                planCrowd={plan?.crowd}
                effectiveProviders={effectiveProviders}
                route={routePlanning}
                locationSearch={locationSearch}
                tripSelection={tripSelection}
                audioGuide={audioGuide}
                participation={participation}
                archiveContext={{
                  region,
                  theme: travelThemes.find((item) => item.id === theme)?.label || theme,
                  profiles: selected.map((id) => accessibilityProfiles.find((item) => item.id === id)?.label || id),
                }}
                onChoosePoint={choosePoint}
                onCopyBookingRoute={copyBookingRoute}
                onMapDestination={routeFromMapPlace}
                onSaveMapPlaces={saveMapPlaces}
              />
            </PlannerStageFrame>
            <PlannerStageFrame view={stageView.view} step={journey.steps[3]} steps={journey.steps} activeStepId={journey.activeStepId} interactive={hydrated} onStepChange={journey.goToStep} onShowOverview={() => stageView.changeView("overview")}>
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
              {!itineraryReviewed && <p role="status">{locale === "en" ? "First review every journey in your itinerary. Unverified journeys do not count as complete." : "일정에서 각 이동 구간을 먼저 확인해 주세요. 미확인 구간이 있으면 여행 준비 완료로 표시하지 않습니다."}</p>}
              <label className="departure-review-check"><input type="checkbox" disabled={!itineraryReviewed} checked={itineraryReviewed && reviewedTrip === reviewSignature} onChange={(event) => setReviewedTrip(event.target.checked ? reviewSignature : "")} />{locale === "en" ? "I reviewed the itinerary and the information to check before leaving. This is not a safety guarantee." : "일정과 출발 전 다시 확인할 항목을 살펴봤어요. 이 확인은 안전 보증이 아닙니다."}</label>
              <button type="button" className="signals-shortcut" onClick={() => { setSecondaryOpen(true); window.requestAnimationFrame(() => document.getElementById("layers")?.scrollIntoView({ behavior: motion === "calm" ? "instant" : "smooth", block: "start" })); }}>{locale === "en" ? "View weather and visitor forecasts" : "날씨·방문 경향 바로 확인하기"}</button>
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
            </PlannerStageFrame>
          </div>
        </div>
      </section>

      {selectedPlace && <PlaceDecisionDialog
        place={selectedPlace}
        region={region}
        saved={saved.includes(selectedPlace.id)}
        canSave={planController.resultCurrent && activePlaces.some((place) => place.id === selectedPlace.id)}
        feedbackText={feedbackText}
        feedbackState={feedbackState}
        dialogRef={placeDialogRef}
        onClose={closeSelectedPlace}
        onToggleSaved={() => { if (saved.includes(selectedPlace.id) || planController.resultCurrent && activePlaces.some((place) => place.id === selectedPlace.id)) toggleSaved(selectedPlace.id, selectedPlace); setSelectedPlace(null); }}
        onFeedbackChange={changeFeedbackText}
        onSubmitFeedback={() => void submitFeedback()}
      />}

      <PlannerFooter />
    </main>
  );
}
