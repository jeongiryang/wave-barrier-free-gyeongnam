"use client";
import { replaceTripWithBackup } from '../../lib/trip-import.js';
import { getTabStorage } from '../../lib/session-storage.js';
import { saveSessionProfiles } from '../../lib/session-travel-profiles.js';
import { emptyTrip } from '../../lib/current-trip-storage.js';
import LoadingState from "../../components/LoadingState";
import NaruLauncher from '../../components/NaruLauncher';
import type { NaruJourney } from '../../lib/naru-journey.js';
import { sanitizeSavedPlaceCatalog } from '../../lib/saved-place-catalog.js';
import { REGION_KEY, THEMES_KEY } from '../../lib/current-trip-storage.js';
import { explorationPlaceAction } from '../../lib/exploration-place-action.js';

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSitePreferences } from "../../components/SitePreferences";
import SkipLink from "../../components/SkipLink";
import PlaceDecisionDialog from "../../features/planner/components/PlaceDecisionDialog";
import PlannerConditionsPanel from "../../features/planner/components/PlannerConditionsPanel";
import PlannerFooter from "../../features/planner/components/PlannerFooter";
import RecommendationWorkspace from "../../features/planner/components/RecommendationWorkspace";
import DepartureReadinessCard from "../../features/planner/components/DepartureReadinessCard";
import TravelSignalsPanel from "../../features/planner/components/TravelSignalsPanel";
import PlannerItineraryWorkspace from "../../features/planner/components/PlannerItineraryWorkspace";
import PlannerServiceStatus from "../../features/planner/components/PlannerServiceStatus";
import { useAudioGuide } from "../../features/planner/hooks/useAudioGuide";
import { useLocationSearch } from "../../features/planner/hooks/useLocationSearch";
import { usePlannerParticipation } from "../../features/planner/hooks/usePlannerParticipation";
import { usePlannerPlan } from "../../features/planner/hooks/usePlannerPlan";
import { usePlannerSignals } from "../../features/planner/hooks/usePlannerSignals";
import { usePlannerActions } from "../../features/planner/hooks/usePlannerActions";
import { usePlaceDialogFocus } from "../../features/planner/hooks/usePlaceDialogFocus";
import { useRoutePlanning } from "../../features/planner/hooks/useRoutePlanning";
import { useTripSelection } from "../../features/planner/hooks/useTripSelection";
import { useTripAlternatives } from "../../features/planner/hooks/useTripAlternatives";
import TripAlternativeTools, { TripReplacementNotice } from "../../features/planner/components/TripAlternativeTools";
import { useRegionChange } from "../../features/planner/hooks/useRegionChange";
import { useItineraryRoutes } from "../../features/planner/hooks/useItineraryRoutes";
import { useJourneyProgress } from "../../features/planner/hooks/useJourneyProgress";
import type { Place } from "../../features/planner/types";
import { buildPlannerViewModel } from "../../features/planner/view-model";
import { usePlannerStageView } from "../../features/planner/hooks/usePlannerStageView";
import { useTripSchedule } from "../../features/planner/hooks/useTripSchedule";
import { themes as travelThemes, departurePresets } from "../../features/planner/constants";
import { useTripGuidancePreferences } from '../../features/planner/hooks/useTripGuidancePreferences';

import { usePlannerChrome } from "../../features/planner/hooks/usePlannerChrome";
import PlannerReferenceChrome from "../../features/planner/components/PlannerHeader";

import RegionChangeDialog from "../../features/planner/components/RegionChangeDialog";

const PlannerAssistant = lazy(() => import("../../features/planner/components/PlannerAssistant"));

const AlternativeComparisonDialog = lazy(() => import("../../features/planner/components/AlternativeComparisonDialog"));
const CourseExpansion = lazy(() => import("../../features/planner/components/CourseExpansion"));

const NaruTripReview = lazy(() => import("../../features/planner/components/NaruTripReview"));
const TripResilienceLab = lazy(() => import("../../features/planner/components/TripResilienceLab"));

export default function PlannerPage() { return null; }

export function PlannerWorkspace({ active = true, onShow, embedded = false, launchRequest = { id: 0, prompt: '' }, pageContext = '여행 설계', onDismiss }: { active?: boolean; onShow?: () => void; embedded?: boolean; launchRequest?: { id: number; prompt: string }; pageContext?: string; onDismiss?: () => void }) {
  const { hydrated, locale, motion, t } = useSitePreferences();
  const planController = usePlannerPlan(locale);
  const {
    selected, region, theme, setTheme, plan,
    setNotice, runPlan,
  } = planController;
  const schedule = useTripSchedule();
  const guidance = useTripGuidancePreferences();
  const routePlanning = useRoutePlanning(region, schedule);
  const [reviewRequest, setReviewRequest] = useState<{ id: number; sourceId: number; prompt: string } | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const resumeAssistant = useRef(false);
  const closeSelectedPlace = useCallback(() => { setSelectedPlace(null); if (resumeAssistant.current) { resumeAssistant.current = false; setAssistantOpen(true); } }, []);
  const placeDialogRef = usePlaceDialogFocus(Boolean(selectedPlace), closeSelectedPlace, true);

  const activePlaces = useMemo(() => plan?.places ?? [], [plan]);
  const canSaveSelectedPlace = planController.resultCurrent && activePlaces.some(place => place === selectedPlace);
  const explorationAction = explorationPlaceAction({ place: selectedPlace, plan, current: planController.resultCurrent, region, criteriaKey: JSON.stringify([region, theme, selected, locale]) });
  usePlannerChrome(plan);
  const [assistantMounted, setAssistantMounted] = useState(false);
  const [naruActivity, setNaruActivity] = useState({ phase: 'idle', text: '' });
  const assistantReturn = useRef<HTMLElement | null>(null);
  const assistantLauncher = useRef<HTMLButtonElement | null>(null);
  const restoreAssistantFocus = useRef(false);
  const restoreNaruFocus = useCallback(() => {
    const previous = assistantReturn.current;
    if (previous?.isConnected && previous !== document.body && previous.getClientRects().length) previous.focus({ preventScroll: true });
    else assistantLauncher.current?.focus({ preventScroll: true });
  }, []);
  const mountAssistantLauncher = useCallback((node: HTMLButtonElement | null) => { assistantLauncher.current = node; if (node && restoreAssistantFocus.current) { restoreAssistantFocus.current = false; requestAnimationFrame(restoreNaruFocus); } }, [restoreNaruFocus]);
  const showAssistant = useCallback(() => { assistantReturn.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; resumeAssistant.current = false; setSelectedPlace(null); setAssistantMounted(true); setAssistantOpen(true); onShow?.(); }, [onShow]);
  const closeAssistant = useCallback(() => { restoreAssistantFocus.current = true; setAssistantOpen(false); onDismiss?.(); requestAnimationFrame(restoreNaruFocus); }, [onDismiss, restoreNaruFocus]);
  useEffect(() => {
    if (!hydrated || !launchRequest.id) return;
    const frame = requestAnimationFrame(showAssistant);
    return () => cancelAnimationFrame(frame);
  }, [hydrated, launchRequest.id, showAssistant]);
  useEffect(() => {
    if (active) return;
    const frame = requestAnimationFrame(closeAssistant);
    return () => cancelAnimationFrame(frame);
  }, [active, closeAssistant]);
  const [newTripError, setNewTripError] = useState('');
  function startNewTrip() {
    try { replaceTripWithBackup(window.localStorage, emptyTrip('', '', '')); saveSessionProfiles(getTabStorage(), []); window.location.assign('/planner'); }
    catch (error) { setNewTripError(error instanceof Error ? error.message : '현재 여행을 보관하지 못했어요.'); }
  }
  const [departureDetailsOpen, setDepartureDetailsOpen] = useState(false);
  const [itineraryMapView, setItineraryMapView] = useState(false);
  const {
    origin, originLabel, privateOrigin, routeDestination,
    destinationCrowd, transportProviders,
    loadRoutes, resetRouteData, setRouteNotice, updateOrigin,
  } = routePlanning;
  const currentActivePlaces = useMemo(() => planController.resultCurrent ? activePlaces : [], [activePlaces, planController.resultCurrent]);
  const tripSelection = useTripSelection({ schedule, activePlaces: currentActivePlaces, origin, accessibilityProfileCount: selected.length, selectedProfiles: selected });
  const itineraryRoutes = useItineraryRoutes(tripSelection, routePlanning);
  const locationSearch = useLocationSearch(region);
  const audioGuide = useAudioGuide(plan?.audio);
  const { resetAudio } = audioGuide;
  const { pointPicker, clearLocationSearch } = locationSearch;
  const { saved, orderedPlaceIds, travelStart, travelEnd, dayStartTime, scheduleAssignments, visitMinutesByPlaceId, toggleSaved, savePlaceIds } = tripSelection;
  const storageSnapshot = {
    [REGION_KEY]: region, [THEMES_KEY]: JSON.stringify(planController.themes),
    'wave-saved-places': JSON.stringify(saved), 'wave-saved-place-catalog-v1': JSON.stringify(sanitizeSavedPlaceCatalog(tripSelection.orderedSavedPlaces)),
    'wave-trip-order-v1': JSON.stringify({ mode: tripSelection.orderMode, ids: tripSelection.manualOrderIds }),
    'wave-trip-schedule-v1': JSON.stringify({ travelStart, travelEnd, dayStartTime, travelMode: schedule.travelMode, scheduleAssignments, visitMinutesByPlaceId, fixedVisits: tripSelection.fixedVisits, dayDeadlines: tripSelection.dayDeadlines, comfort: tripSelection.comfort, breakMinutesByPlaceId: tripSelection.breakMinutesByPlaceId, restPurposeByPlaceId: tripSelection.restPurposeByPlaceId }),
  };
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
    travelMode: schedule.travelMode,
    scheduleAssignments,
    visitMinutesByPlaceId,
    selectedPlaceIds: orderedPlaceIds,
    temporaryStops: tripSelection.orderedSavedPlaces.filter(place => place.temporaryStop),
    fixedVisits: tripSelection.fixedVisits,
    dayDeadlines: tripSelection.dayDeadlines,
    breakMinutesByPlaceId: tripSelection.breakMinutesByPlaceId, restPurposeByPlaceId: tripSelection.restPurposeByPlaceId,
    originLabel,
    selectedPlace,
  });
  const { feedbackText, feedbackState, changeFeedbackText, submitFeedback } = participation;
  const stageView = usePlannerStageView();
  const alternatives = useTripAlternatives(tripSelection, () => {
    resetRouteData(); stageView.changeStep("itinerary", true);
  });
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
      alternatives.clear();
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
    // Retry and stale-result recovery belong to the result screen even while
    // the response cannot yet contribute to readiness or enable place actions.
    resultsAvailable: Boolean(plan || planController.loading || planController.planError),
    reviewed: reviewedTrip === reviewSignature,
    itineraryReviewed,
    motion,
    observeSections: false,
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
    effectiveProviders,
    liveCount,
    providerErrors,
    dataErrors,
    richItems,
    visitorTypes,
    demandMax,
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
      const target = tripSelection.orderedSavedPlaces.find(place => (scheduleAssignments[place.id] || tripSelection.tripDays[0]) === tripSelection.activeDay);
      if (target) { alternatives.open(target.id, "indoor"); return; }
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
      if (target) alternatives.open(target.id);
    },
    updateOrigin,
    loadRoutes,
    clearLocationSearch,
    setRouteNotice,
  });

  const searchKey = JSON.stringify([region, theme, selected]);
  const automaticSearch = useRef("");

  async function generatePlan(revealResults = true, requestedTheme = theme) { await searchPlaces(revealResults, requestedTheme); }
  async function searchPlaces(revealResults = true, requestedTheme = theme) {
    const requestedRegion = region || "경남 전체";
    const effectiveTheme = requestedTheme;
    if (!region) planController.setRegion(requestedRegion);
    // A manual refresh also fulfils the pending search for these conditions.
    // Otherwise its completion schedules a second request after the debounce.
    automaticSearch.current = JSON.stringify([requestedRegion, effectiveTheme, selected]);
    return await runPlan({
      requestedRegion, requestedTheme: effectiveTheme,
      resetRouteData,
      resetAudio,
      onRevealResults: () => stageView.changeStep("places", true),
    }, revealResults);
  }

  useEffect(() => {
    if (!hydrated || !planController.criteriaReady || !tripSelection.storageReady || !region || planController.loading || automaticSearch.current === searchKey) return;
    const timer = setTimeout(() => {
      automaticSearch.current = searchKey;
      void runPlan({ resetRouteData, resetAudio }, false);
    }, 250);
    return () => clearTimeout(timer);
  }, [hydrated, planController.criteriaReady, tripSelection.storageReady, region, planController.loading, searchKey, runPlan, resetRouteData, resetAudio]);

  async function searchForNaru(criteria?: { region?: string; profiles?: string[]; themes?: string[] }) {
    const nextRegion = criteria?.region || region || '경남 전체';
    const nextSelected = criteria?.profiles || selected;
    const nextTheme = criteria?.themes?.join(',') ?? theme;
    planController.setRegion(nextRegion); planController.setSelected(nextSelected); planController.setTheme(nextTheme);
    automaticSearch.current = JSON.stringify([nextRegion, nextTheme, nextSelected]);
    const ok = await runPlan({ resetRouteData, resetAudio, requestedRegion: nextRegion, requestedTheme: nextTheme, requestedFacilities: nextSelected }, false);
    return ok ? planController.getPlan() : null;
  }

  const assistantToolFocusCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => assistantToolFocusCleanup.current?.(), []);
  function openAssistantTool(tool: string) {
    assistantToolFocusCleanup.current?.();
    stageView.changeView("guided");
    if (["conditions", "facilities"].includes(tool)) stageView.changeStep('conditions');
    else if (["places", "compare", "inquiry", "preview", "transcript"].includes(tool)) stageView.changeStep('places');
    else { stageView.changeStep('itinerary'); setItineraryMapView(tool === 'map'); if (['readiness','weather'].includes(tool)) { setDepartureDetailsOpen(true); if (tool === 'weather') setSecondaryOpen(true); } }
    const selectors: Record<string, string> = { conditions: '.simple-search-bar select', facilities: '.simple-facility-trigger', dates: '.simple-itinerary-heading > button', receipt: '[data-planner-tool="receipt"] > summary', comfort: '.simple-day-options > summary', budget: '[data-planner-tool="budget"] > summary', offline: '[data-planner-tool="offline"]', 'on-trip': '[data-planner-tool="on-trip"]', split: '[data-planner-tool="split"]', alternatives: '[data-planner-tool="alternatives"] > summary', course: '[data-planner-tool="course"] > summary', save: '[data-planner-tool="save"] > button', share: '[data-planner-tool="share"]', transport: '[data-planner-tool="transport"]', calendar: '[data-planner-tool="share"]', weather: '.weather-heading > button', readiness: '.simple-readiness', map: '#itinerary-map', itinerary: '#itinerary', places: '#places', compare: '#places', inquiry: '#places', preview: '#places', transcript: '#places' };
    const focusTarget = () => {
      const node = document.querySelector<HTMLElement>(tool === 'dates' && !travelStart ? '#itinerary-setup input' : selectors[tool] || '#planner');
      if (!node) return false;
      for (let parent = node.parentElement; parent; parent = parent.parentElement) if (parent instanceof HTMLDetailsElement) parent.open = true;
      if (!node.getClientRects().length) return false;
      if (!node.matches('button,summary,a,input,select')) node.setAttribute('tabindex', '-1');
      node.scrollIntoView({ block: 'start', behavior: motion === 'calm' ? 'instant' : 'smooth' }); node.focus({ preventScroll: true });
      return document.activeElement === node;
    };
    // Tool sections may load after navigation; focus once the real target mounts.
    let frame = 0;
    const cleanup = () => { observer.disconnect(); clearTimeout(timeout); cancelAnimationFrame(frame); };
    const scheduleFocus = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { if (focusTarget()) cleanup(); }); };
    const observer = new MutationObserver(scheduleFocus);
    const timeout = setTimeout(cleanup, 5000);
    observer.observe(document.getElementById('planner') || document.body, { childList: true, subtree: true });
    frame = requestAnimationFrame(scheduleFocus);
    assistantToolFocusCleanup.current = cleanup;
  }
  function applyNaruJourney(draft: NaruJourney) {
    routePlanning.setRouteTravelMode(draft.transport);
    const departure = draft.originRegion ? departurePresets.find(item => item.name.startsWith(draft.originRegion!)) : undefined;
    if (departure) routePlanning.updateOrigin(departure.point, departure.name);
    setItineraryMapView(true); stageView.changeStep('itinerary', true);
    return { revision: JSON.stringify([draft.transport, departure?.point || origin, departure?.name || originLabel, departure ? false : privateOrigin]),
      undo: () => { routePlanning.setRouteTravelMode(routePlanning.routeTravelMode); updateOrigin(origin, originLabel, privateOrigin); },
    };
  }
  async function recalculateNaruRoute(transport?: NaruJourney['transport']) {
    if (transport && transport !== routePlanning.routeTravelMode) {
      // The existing automatic effect must observe the committed new mode.
      // Calling checkRoutes here would still read this render's previous mode.
      routePlanning.setRouteTravelMode(transport);
      return 'changed' as const;
    }
    await itineraryRoutes.checkRoutes();
    return 'checked' as const;
  }
  const browsing = journey.activeStepId === "conditions" || journey.activeStepId === "places";
  const plannerStages = <div className="simple-stage-stream">
    <div hidden={!browsing} className="simple-browse-view">
      <PlannerConditionsPanel onRegionChange={regionChange.request} view="guided" question={stageView.conditionQuestion} onQuestion={stageView.changeQuestion} onItinerary={() => journey.goToStep("itinerary")} onGenerate={generatePlan} t={t} activePlaces={activePlaces} planController={planController} route={routePlanning} tripSelection={tripSelection} />
      {region && <RecommendationWorkspace region={region} activePlaces={activePlaces} planController={planController} tripSelection={tripSelection} weather={weather} weatherDate={travelStart} onGenerate={generatePlan} onSelectPlace={setSelectedPlace} onRegionSelect={next => regionChange.request(next, () => stageView.changeStep("conditions", true))} onBuildItinerary={() => stageView.changeStep("itinerary", true)} onMore={async () => { await runPlan({ resetRouteData, resetAudio, page: plan?.pagination?.nextPage ?? (plan?.pagination?.page || 1) + 1 }, false); }} />}
    </div>
    <div hidden={browsing} className="simple-itinerary-view">
      <TripReplacementNotice alternatives={alternatives} />
      <PlannerItineraryWorkspace active={!browsing}
                alternativeTools={<><TripAlternativeTools trip={tripSelection} alternatives={alternatives} /><Suspense fallback={<LoadingState>코스 도구를 준비하고 있어요.</LoadingState>}><CourseExpansion trip={tripSelection} region={region} themes={theme} profiles={selected} plan={plan} current={planController.resultCurrent} onSelectPlace={setSelectedPlace}/></Suspense><button type="button" onClick={showAssistant}>나루에게 일정 변경 요청하기</button><PlannerServiceStatus locale={locale} keyHealth={keyHealth} effectiveProviders={effectiveProviders} transportProviders={transportProviders} providerErrors={providerErrors} liveCount={liveCount} dataErrors={dataErrors} plan={plan}/></>}
                mapView={itineraryMapView}
                onMapViewChange={setItineraryMapView}
                canAddPlaces={planController.resultCurrent}
                expanded={false}
                weather={weather}
                weatherLoading={weatherLoading}
                onSelectPlace={setSelectedPlace}
                onAlternative={id => alternatives.open(id)}
                onContinue={() => setDepartureDetailsOpen(true)}
                coverage={itineraryRoutes}
                reviewed={itineraryReviewed}
                onReview={(checked) => setReviewedItinerary(checked ? itinerarySignature : "")}
                mapEnabled={journey.activeStepId === "itinerary" || journey.activeStepId === "departure-readiness"}
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
                  profiles: selected,
                  guidancePreferences: guidance.value,
                }}
                onChoosePoint={choosePoint}
                onCopyBookingRoute={copyBookingRoute}
                onMapDestination={routeFromMapPlace}
                onSaveMapPlaces={saveMapPlaces}
                onProfiles={planController.setSelected}
              />
      {travelStart && <details className="simple-departure" id="departure-readiness" open={departureDetailsOpen || journey.activeStepId === "departure-readiness"} onToggle={event => setDepartureDetailsOpen(event.currentTarget.open)}>
        <summary><span>일정 점검</span><small>시간 · 휴식 · 날씨 · 운영정보</small><span aria-hidden="true">⌄</span></summary>
        <div>{(departureDetailsOpen || journey.activeStepId === 'departure-readiness') && <Suspense fallback={<LoadingState>점검 중</LoadingState>}>
          <NaruTripReview autoFocus={false} places={tripSelection.orderedSavedPlaces} days={tripSelection.tripDays} assignments={tripSelection.scheduleAssignments} startTime={tripSelection.dayStartTime} origin={origin} routeMinutes={itineraryRoutes.routeMinutes} visits={tripSelection.visitMinutesByPlaceId} breaks={tripSelection.breakMinutesByPlaceId} fixed={tripSelection.fixedVisits} deadlines={tripSelection.dayDeadlines} comfort={tripSelection.comfort} onTool={openAssistantTool} onDetails={setSelectedPlace} onAlternative={id => alternatives.open(id)} onRequest={prompt => { setReviewRequest({ id: Date.now(), sourceId: launchRequest.id, prompt }); showAssistant(); }} />
          <details><summary>비·휴무·피로에 대비하기</summary><TripResilienceLab trip={tripSelection} coverage={itineraryRoutes} requiredKeys={selected} weather={weather} onProfiles={planController.setSelected} onAlternative={id => alternatives.open(id)} onSelectPlace={setSelectedPlace}/></details>
        </Suspense>}<DepartureReadinessCard
                embedded
                canRefreshPlaces={true}
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
              /><TravelSignalsPanel
                region={region}
                places={tripSelection.orderedSavedPlaces}
                visitDate={travelStart}
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
              /></div>
      </details>}
    </div>
  </div>;

  return (
    <main role={embedded ? "presentation" : undefined} className={`planner-page journey-editorial planner-reference planner-simple wave-night`} lang={locale}>
      {!embedded && <SkipLink href="#planner">{t("skip", "본문으로 바로가기")}</SkipLink>}
      {!embedded && <PlannerReferenceChrome storageSnapshot={storageSnapshot} interactive={hydrated && planController.criteriaReady && tripSelection.storageReady} savedCount={saved.length} activeStep={journey.activeStepId} onNavigate={journey.goToStep} onNew={startNewTrip} onAskNaru={showAssistant} />}
      {newTripError && <p role="alert">{newTripError}</p>}
      <section className="planner-journey-workspace" id="planner" aria-label="여행 만들기">
        <div className="simple-workspace-body">{plannerStages}</div>
      </section>

      {alternatives.original && alternatives.request && <Suspense fallback={<LoadingState>대안을 비교할 화면을 준비하고 있어요.</LoadingState>}><AlternativeComparisonDialog
        key={alternatives.original.id} original={alternatives.original} initialReason={alternatives.request.reason}
        seenIds={alternatives.request.seenIds} trip={tripSelection} origin={origin} places={[...activePlaces, ...(plan?.explorationPlaces || [])]}
        requiredKeys={plan?.criteria?.facilityKeys || []} current={planController.resultCurrent}
        region={region} themes={theme} profiles={selected} weather={weather}
        onApply={alternatives.apply} onClose={alternatives.close}
      /></Suspense>}
      {selectedPlace && <PlaceDecisionDialog
        place={selectedPlace}
        region={region}
        saved={saved.includes(selectedPlace.id)}
        canSave={canSaveSelectedPlace}
        explorationAction={explorationAction}
        guidancePreferences={guidance.value}
        feedbackText={feedbackText}
        feedbackState={feedbackState}
        dialogRef={placeDialogRef}
        onClose={closeSelectedPlace}
        onToggleSaved={acknowledgedKey => {
          if (saved.includes(selectedPlace.id) || canSaveSelectedPlace
            || explorationAction.kind === "acknowledge" && acknowledgedKey === explorationAction.key) {
            if (toggleSaved(selectedPlace.id, selectedPlace)) closeSelectedPlace();
          }
        }}
        onFeedbackChange={changeFeedbackText}
        onSubmitFeedback={() => void submitFeedback()}
      />}

      {regionChange.pending && <RegionChangeDialog region={regionChange.pending} en={locale === "en"} error={regionChange.error} onCancel={regionChange.cancel} onAdd={regionChange.add} onNew={regionChange.startNew} />}
      {!embedded && !assistantOpen && <NaruLauncher state={naruActivity.phase} buttonRef={mountAssistantLauncher} disabled={!hydrated || !planController.criteriaReady || !tripSelection.storageReady} onOpen={showAssistant} />}

      {assistantMounted && <Suspense fallback={assistantOpen ? <div className="naru-panel"><LoadingState>나루와의 대화를 열고 있어요.</LoadingState></div> : null}><PlannerAssistant origin={origin} routeMinutes={itineraryRoutes.routeMinutes} launchRequest={reviewRequest?.sourceId === launchRequest.id ? reviewRequest : launchRequest} pageContext={pageContext} open={assistantOpen} onClose={closeAssistant} plan={planController} trip={tripSelection} guidance={guidance} onRegion={regionChange.request} onSearch={searchForNaru} onPlace={place => { resumeAssistant.current = true; setAssistantOpen(false); setSelectedPlace(place); }} onAlternative={id => alternatives.open(id)} onUndoAlternative={alternatives.undoReplacement} canUndoAlternative={alternatives.canUndo} replacementVersion={alternatives.replacementVersion} onOpenTool={openAssistantTool} transport={routePlanning.routeTravelMode} routeRevision={JSON.stringify([routePlanning.routeTravelMode, origin, originLabel, privateOrigin])} onJourneyApplied={applyNaruJourney} onRecalculate={recalculateNaruRoute} onActivity={setNaruActivity} /></Suspense>}
      {!embedded && <PlannerFooter />}
    </main>
  );
}
