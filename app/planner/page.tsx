"use client";

import {
  lazy,
  Suspense,
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
import RecommendationWorkspace from "../../features/planner/components/RecommendationWorkspace";
import DepartureReadinessCard from "../../features/planner/components/DepartureReadinessCard";
import TravelSignalsPanel from "../../features/planner/components/TravelSignalsPanel";
import PlannerItineraryWorkspace from "../../features/planner/components/PlannerItineraryWorkspace";
import { useAudioGuide } from "../../features/planner/hooks/useAudioGuide";
import { useLocationSearch } from "../../features/planner/hooks/useLocationSearch";
import { usePlannerParticipation } from "../../features/planner/hooks/usePlannerParticipation";
import { usePlannerPlan } from "../../features/planner/hooks/usePlannerPlan";
import { usePlannerSignals } from "../../features/planner/hooks/usePlannerSignals";
import { usePlannerActions } from "../../features/planner/hooks/usePlannerActions";
import { usePlaceDialogFocus } from "../../features/planner/hooks/usePlaceDialogFocus";
import { useRoutePlanning } from "../../features/planner/hooks/useRoutePlanning";
import { useTripSelection } from "../../features/planner/hooks/useTripSelection";
import { useRegionChange } from "../../features/planner/hooks/useRegionChange";
import { useItineraryRoutes } from "../../features/planner/hooks/useItineraryRoutes";
import { useJourneyProgress } from "../../features/planner/hooks/useJourneyProgress";
import type { Place } from "../../features/planner/types";
import { buildPlannerViewModel } from "../../features/planner/view-model";
import { usePlannerStageView } from "../../features/planner/hooks/usePlannerStageView";
import { profiles as accessibilityProfiles, themes as travelThemes } from "../../features/planner/constants";

import PlannerStageFrame from "../../features/planner/components/PlannerStageFrame";
import { usePlannerChrome } from "../../features/planner/hooks/usePlannerChrome";
import PlannerJourneyModeToggle from "../../features/planner/components/PlannerJourneyModeToggle";
import PlannerReferenceChrome from "../../features/planner/components/PlannerHeader";
import PlannerStepSummary from "../../features/planner/components/PlannerStepSummary";

import RegionChangeDialog from "../../features/planner/components/RegionChangeDialog";

const PlannerTripOverview = lazy(() => import("../../features/planner/components/PlannerTripOverview"));

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
  usePlannerChrome(plan);
  const [departureDetailsOpen, setDepartureDetailsOpen] = useState(false);
  const [itineraryMapView, setItineraryMapView] = useState(false);
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
  const { saved, orderedPlaceIds, travelStart, travelEnd, dayStartTime, scheduleAssignments, visitMinutesByPlaceId, toggleSaved, savePlaceIds } = tripSelection;
  const saveMapPlaces = useCallback(
    (mapPlaces: { id: string }[]) => savePlaceIds(mapPlaces.map((place) => place.id)),
    [savePlaceIds],
  );
  const {
    keyHealth, keyHealthChecked, enrichment, enrichmentLoading, richMode, setRichMode,
    secondaryOpen, setSecondaryOpen,
    weather, weatherFailure, weatherLoading, reloadWeather, loadEnrichment, resetWeather, resetEnrichment,
  } = usePlannerSignals({ plan, region, theme, locale, travelStart, travelEnd });
  const participation = usePlannerParticipation({
    region,
    theme,
    profiles: selected,
    locale,
    travelStart,
    travelEnd,
    dayStartTime,
    scheduleAssignments,
    visitMinutesByPlaceId,
    selectedPlaceIds: orderedPlaceIds,
    originLabel,
    selectedPlace,
  });
  const { feedbackText, feedbackState, changeFeedbackText, submitFeedback } = participation;
  const stageView = usePlannerStageView();
  const { changeStep: changePlannerStep } = stageView;
  const openTravelSignals = useCallback((target: "layers" | "crowd") => {
    setDepartureDetailsOpen(true);
    setSecondaryOpen(true);
    changePlannerStep("departure-readiness", true, target);
  }, [setSecondaryOpen, changePlannerStep]);
  const [reviewedTrip, setReviewedTrip] = useState("");
  const [reviewedItinerary, setReviewedItinerary] = useState("");
  const regionChange = useRegionChange({
    region, ready: planController.criteriaReady && tripSelection.storageReady, hasSaved: saved.length > 0,
    setRegion: planController.setRegion, resetTrip: tripSelection.resetTrip,
    clearResults: (fresh) => {
      if (fresh) {
        routePlanning.resetOrigin(); routePlanning.resetRouteView();
        planController.clearSelectedProfiles(); planController.setTheme("");
      }
      planController.resetPlan(); resetRouteData(); itineraryRoutes.resetItineraryRoutes();
      resetAudio(); clearLocationSearch(); resetWeather(); resetEnrichment();
      setSelectedPlace(null); setReviewedTrip(""); setReviewedItinerary(""); setSecondaryOpen(false);
    },
  });
  const itinerarySignature = JSON.stringify([itineraryRoutes.signature, routePlanning.routeTravelMode, dayStartTime, visitMinutesByPlaceId]);
  const itineraryReviewed = reviewedItinerary === itinerarySignature && itineraryRoutes.complete && !itineraryRoutes.loading;
  const reviewSignature = JSON.stringify([region, theme, selected, orderedPlaceIds, travelStart, travelEnd, scheduleAssignments, origin, routePlanning.activeRoute?.id, dayStartTime, itinerarySignature, weather?.updatedAt]);
  const journey = useJourneyProgress({
    tripReady: planController.criteriaReady && tripSelection.storageReady,
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
    locale,
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
      stageView.changeStep("conditions", true);
      await runPlan({ resetRouteData, resetAudio, requestedTheme: "history", onRevealResults: () => stageView.changeStep("places", true) });
    },
    onSelectDestination: (place) => {
      if (!saved.includes(place.id)) {
        if (!window.confirm(locale === "en" ? `Add ${place.name} to ${tripSelection.activeDay} and check the route? Facility access still needs verification.` : `${place.name}을(를) ${tripSelection.activeDay} 일정에 추가하고 경로를 확인할까요? 편의시설 정보는 별도로 확인해야 합니다.`)) return false;
        toggleSaved(place.id, place);
        tripSelection.assignPlaceToDay(place.id, tripSelection.activeDay);
      } else {
        const day = scheduleAssignments[place.id] || tripSelection.tripDays[0];
        if (!tripSelection.tripDays.includes(day)) {
          setNotice("outsideTrip");
          return false;
        }
        tripSelection.setActiveDay(day);
      }
      stageView.changeStep("itinerary", true);
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
        setNotice("replaced");
        stageView.changeStep("itinerary", true);
      }
    },
    updateOrigin,
    loadRoutes,
    clearLocationSearch,
    setRouteNotice,
  });

  async function generatePlan(revealResults = true) {
    await runPlan({
      resetRouteData,
      resetAudio,
      onRevealResults: () => stageView.changeStep("places", true),
    }, revealResults);
  }

  return (
    <main className="planner-page journey-editorial planner-reference" lang={locale}>
      <SkipLink href="#planner">{t("skip", "본문으로 바로가기")}</SkipLink>
      <PlannerReferenceChrome view={stageView.view} progress={journey.progress} requestState={planController.requestState} recommendedCount={activePlaces.length} region={region} dates={travelStart ? `${travelStart.slice(5).replace("-", "월 ")}일 - ${travelEnd.slice(5).replace("-", "월 ")}일` : ""} facilities={selected.map(id => accessibilityProfiles.find(p => p.id === id)?.label || id).join(" · ")} savedCount={saved.length} activeStep={journey.activeStepId} question={stageView.conditionQuestion}
        activities={planController.themes.length ? `활동 ${planController.themes.length}개` : ""} resultsAvailable={journey.steps[1].available}
        available={[true, Boolean(region), Boolean(region && selected.length), Boolean(region && selected.length && planController.themes.length), true, saved.length > 0, saved.length > 0]}
        onQuestion={stageView.changeQuestion} onNavigate={journey.goToStep} onSearch={() => void generatePlan()} searching={planController.loading} />
      <section className="planner-journey-workspace" id="planner" aria-label="여행 만들기">
        <div className="journey-control-layout" data-compact-conditions={stageView.view === "guided" && journey.activeStepId === "conditions"}>
          <div className="journey-stage-stream" data-view={stageView.view}>
            <PlannerStageFrame view={stageView.view} step={journey.steps[0]} steps={journey.steps} activeStepId={journey.activeStepId} interactive={hydrated} onStepChange={journey.goToStep} onShowOverview={() => stageView.changeView("overview")}>
              <PlannerConditionsPanel
                onRegionChange={regionChange.request}
                view={stageView.view}
                question={stageView.conditionQuestion}
                onQuestion={stageView.changeQuestion}
                onItinerary={() => journey.goToStep("itinerary")}
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
                region={region}
                activePlaces={activePlaces}
                planController={planController}
                tripSelection={tripSelection}
                onGenerate={generatePlan}
                onSelectPlace={setSelectedPlace}
              />
              <div className="reference-bottom-bar"><div><strong>선택한 여행지 {saved.length}곳</strong><small>여행지는 일정에서 더 추가할 수 있어요.</small></div><button type="button" disabled={!saved.length} onClick={() => journey.goToStep("itinerary")}>{locale === "en" ? "Next: Itinerary" : "다음: 일정 만들기"} →</button></div>
            </PlannerStageFrame>
            <PlannerStageFrame view={stageView.view} step={journey.steps[2]} steps={journey.steps} activeStepId={journey.activeStepId} interactive={hydrated} onStepChange={journey.goToStep} onShowOverview={() => stageView.changeView("overview")}>
              <PlannerItineraryWorkspace
                mapView={itineraryMapView}
                onMapViewChange={setItineraryMapView}
                canAddPlaces={planController.resultCurrent}
                expanded={stageView.view === "overview"}
                weather={weather}
                weatherLoading={weatherLoading}
                onSelectPlace={setSelectedPlace}
                onContinue={() => journey.goToStep("departure-readiness")}
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
              {stageView.view !== "overview" && journey.activeStepId === "departure-readiness" && <section className="reference-overview" aria-labelledby="reference-overview-title">
                <h2 id="reference-overview-title">{region || "경남"} 여행, 한눈에 확인하세요.</h2>
                <Suspense fallback={<p role="status">전체 일정을 준비하고 있어요.</p>}><PlannerTripOverview trip={tripSelection} participation={participation} coverage={itineraryRoutes} origin={origin} weather={weather} weatherLoading={weatherLoading} region={region} theme={travelThemes.find(item => item.id === theme)?.label || theme} profiles={selected.map(id => accessibilityProfiles.find(item => item.id === id)?.label || id)} onEdit={() => { setItineraryMapView(false); journey.goToStep("itinerary"); }} onMap={() => { setItineraryMapView(true); journey.goToStep("itinerary"); }} onSelectPlace={setSelectedPlace} onDetails={() => setDepartureDetailsOpen(true)} /></Suspense></section>}
              <details className="reference-departure-details" open={stageView.view === "overview" || departureDetailsOpen} onToggle={event => setDepartureDetailsOpen(event.currentTarget.open)}><summary>출발 전 정보와 여행 도구 자세히 보기</summary>
              <DepartureReadinessCard
                embedded
                canRefreshPlaces={Boolean(region && theme && selected.length)}
                placesLoading={planController.loading}
                placeCriteriaCurrent={planController.resultCurrent}
                plan={plan}
                destinationCrowd={destinationCrowd}
                destinationPlaceId={routeDestination?.id}
                region={region}
                weather={weather}
                weatherLoading={weatherLoading}
                routeCoverage={{ total: itineraryRoutes.legs.length, verified: itineraryRoutes.readyCount, loading: itineraryRoutes.loading }}
                tripSelection={tripSelection}
                participation={participation}
                onRefresh={() => { reloadWeather(); return generatePlan(false); }}
                onOpenSignals={openTravelSignals}
              />
              {!itineraryReviewed && <p role="status">{locale === "en" ? "First review every journey in your itinerary. Unverified journeys do not count as complete." : "일정에서 각 이동 구간을 먼저 확인해 주세요. 미확인 구간이 있으면 여행 준비 완료로 표시하지 않습니다."}</p>}
              <label className="departure-review-check"><input type="checkbox" disabled={!itineraryReviewed} checked={itineraryReviewed && reviewedTrip === reviewSignature} onChange={(event) => setReviewedTrip(event.target.checked ? reviewSignature : "")} />{locale === "en" ? "I reviewed the itinerary and the information to check before leaving. This is not a safety guarantee." : "일정과 출발 전 다시 확인할 항목을 살펴봤어요. 이 확인은 안전 보증이 아닙니다."}</label>
              <button type="button" className="signals-shortcut" onClick={() => openTravelSignals("layers")}>{locale === "en" ? "View weather and visitor forecasts" : "날씨·방문 경향 바로 확인하기"}</button>
              <TravelSignalsPanel
                region={region}
                weatherFailure={weatherFailure}
                onReloadWeather={reloadWeather}
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
              </details>
            </PlannerStageFrame>
          </div>
          {stageView.view === "guided" && journey.activeStepId === "conditions" && <PlannerStepSummary en={locale === "en"} region={region} dates={`${travelStart} – ${travelEnd}`} activities={planController.themes.map(id => travelThemes.find(item => item.id === id)?.label || id).join(" · ")} facilities={selected.map(id => accessibilityProfiles.find(item => item.id === id)?.label || id).join(" · ")} places={tripSelection.orderedSavedPlaces} onQuestion={stageView.changeQuestion} onItinerary={() => journey.goToStep("itinerary")} />}
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

      {regionChange.pending && <RegionChangeDialog region={regionChange.pending} en={locale === "en"} error={regionChange.error} onCancel={regionChange.cancel} onAdd={regionChange.add} onNew={regionChange.startNew} />}
      <div className="reference-view-preference"><PlannerJourneyModeToggle view={stageView.view} interactive={hydrated} onChange={stageView.changeView} /></div>
      <PlannerFooter />
    </main>
  );
}
