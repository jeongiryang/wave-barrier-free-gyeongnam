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
import { usePlannerAutoRefresh } from "../../features/planner/hooks/usePlannerAutoRefresh";
import { useRoutePlanning } from "../../features/planner/hooks/useRoutePlanning";
import { useTripSelection } from "../../features/planner/hooks/useTripSelection";
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
  const stageView = usePlannerStageView();
  const journey = useJourneyProgress({
    motion,
    observeSections: stageView.view === "overview",
    activeStepId: stageView.activeStepId,
    onActiveStepChange: stageView.changeStep,
    selectedProfileCount: selected.length,
    recommendedCount: activePlaces.length,
    savedCount: saved.length,
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
      <SkipLink href="#planner">{t("skip", "본문으로 바로가기")}</SkipLink>
      <div className="scroll-progress" aria-hidden="true" />
      <PlannerHeader t={t} scrolled={scrolled} hidden={headerHidden} savedCount={saved.length} onNavigate={journey.goToStep} />

      <section className="planner-journey-workspace" id="planner" aria-labelledby="journey-workspace-title">
        <header className="journey-workspace-hero" data-reveal>
          <div className="journey-hero-copy">
            <p>W.A.V.E JOURNEY CONTROL</p>
            <h1 id="journey-workspace-title" aria-label="나에게 맞는 여행을 4단계로 완성하세요.">어떤 여행이<br />편안할까요?</h1>
            <span>나에게 맞는 여행을 4단계로 완성하세요. 한 번에 한 가지 질문만 따라가도 확인된 근거와 다음 행동이 자연스럽게 이어집니다.</span>
          </div>
          <div className="journey-briefing-card" aria-label="현재 여행 브리핑">
            <div><span>현재 준비도</span><strong>{journey.progress}%</strong></div>
            <div className="journey-briefing-progress" aria-hidden="true"><i style={{ width: `${journey.progress}%` }} /></div>
            <dl>
              <div><dt>필요 편의</dt><dd>{selected.length ? `${selected.length}개 선택` : "선택 전"}</dd></div>
              <div><dt>일정</dt><dd>{saved.length ? `${saved.length}곳 저장` : "장소 선택 전"}</dd></div>
              <div><dt>경로</dt><dd>{routeDestination?.name || "목적지 미확인"}</dd></div>
            </dl>
            <PlannerJourneyModeToggle view={stageView.view} interactive={hydrated} onChange={stageView.changeView} />
            <button type="button" disabled={!hydrated} onClick={() => { stageView.changeView("guided"); journey.goToStep(journey.nextStep.id); }}>{stageView.view === "guided" ? "다음 질문" : "한 단계씩 이어가기"}: {journey.nextStep.label}<span aria-hidden="true">→</span></button>
          </div>
          <div className="journey-trust-legend" aria-label="정보 상태 안내">
            <span data-state="confirmed"><i aria-hidden="true" />확인됨 <small>공식 근거·실제 응답</small></span>
            <span data-state="partial"><i aria-hidden="true" />일부 확인 <small>확인 범위 제한</small></span>
            <span data-state="recheck"><i aria-hidden="true" />재확인 필요 <small>예측·미조회·변경 가능</small></span>
          </div>
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
