"use client";
import LoadingState from "../../../components/LoadingState";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import { supportedPlacePoint } from "../../../lib/map-coordinates.js";
import type { MapPlace } from "../../routing/types";
import type { useAudioGuide } from "../hooks/useAudioGuide";
import type { useLocationSearch } from "../hooks/useLocationSearch";
import type { usePlannerParticipation } from "../hooks/usePlannerParticipation";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place, PlanData, TransportProvider, WeatherData } from "../types";
import Link from 'next/link';
import TripBudgetEntry from './TripBudgetEntry';
import TripDayTools from './TripDayTools';
import { buildTravelJournalHref } from '../../../lib/community/field-report.js';
import NavigationWorkspace from "./NavigationWorkspace";
import TripSettingsEditor, { InitialTripSetup } from "./TripSettingsEditor";
import type { useItineraryRoutes } from "../hooks/useItineraryRoutes";

const PlannerItineraryBoard = lazy(() => import("./PlannerItineraryBoard").catch(() => ({ default: ItineraryUnavailable })));

const AudioGuidePlayer = lazy(() => import("./AudioGuidePlayer").catch(() => ({ default: AudioUnavailable })));
function AudioUnavailable() {
  const { locale } = useSitePreferences();
  return <p role="status" lang={locale}>{locale === 'en' ? "The audio guide couldn't open. You can keep editing your itinerary. Reload this page to try the guide again." : '오디오 안내를 열지 못했어요. 일정은 계속 편집할 수 있어요. 안내를 다시 시도하려면 화면을 새로 불러와 주세요.'}</p>;
}
const ItineraryRouteCoverage = lazy(() => import("./ItineraryRouteCoverage"));
const SavedPlaceCoordinateRecovery = lazy(() => import("./SavedPlaceCoordinateRecovery"));
const TravelExperience = lazy(() => import('./TravelExperience'));
function ItineraryUnavailable() {
  const { locale } = useSitePreferences();
  return <p role="status">{locale === "en" ? "The itinerary editor couldn't open. Try reloading this page." : "일정 편집 화면을 열지 못했습니다. 페이지를 새로 열어 다시 시도해 주세요."}</p>;
}
const TripDayPlanner = lazy(() => import("./TripDayPlanner").catch(() => ({ default: ItineraryUnavailable })));

interface PlannerItineraryWorkspaceProps {
  active: boolean;
  alternativeTools?: ReactNode;
  mapView: boolean;
  onMapViewChange: (value: boolean) => void;
  canAddPlaces: boolean;
  expanded?: boolean;
  weather: WeatherData | null;
  weatherLoading: boolean;
  onSelectPlace: (place: Place) => void;
  onContinue: () => void;
  coverage: ReturnType<typeof useItineraryRoutes>;
  reviewed: boolean;
  onReview: (checked: boolean) => void;
  mapEnabled: boolean;
  plan: PlanData | null;
  activePlaces: Place[];
  planCrowd: PlanData["crowd"];
  effectiveProviders: TransportProvider[];
  route: ReturnType<typeof useRoutePlanning>;
  locationSearch: ReturnType<typeof useLocationSearch>;
  tripSelection: ReturnType<typeof useTripSelection>;
  audioGuide: ReturnType<typeof useAudioGuide>;
  participation: ReturnType<typeof usePlannerParticipation>;
  archiveContext: { region: string; theme: string; profiles: string[]; guidancePreferences?: import('../../../lib/guidance-preferences.js').GuidancePreferences };
  onChoosePoint: (place: Place) => void;
  onCopyBookingRoute: (provider: string) => Promise<void>;
  onMapDestination: (place: MapPlace) => void;
  onSaveMapPlaces: (places: MapPlace[]) => number;
}

export default function PlannerItineraryWorkspace(props: PlannerItineraryWorkspaceProps) {
  const { locale } = useSitePreferences();
  const [desktop, setDesktop] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  // Load the board on its first visit; preserve map/editor state on later tab changes.
  const [editorOpened, setEditorOpened] = useState(props.active);
  useEffect(() => {
    if (!props.active || editorOpened) return;
    const frame = requestAnimationFrame(() => setEditorOpened(true));
    return () => cancelAnimationFrame(frame);
  }, [props.active, editorOpened]);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  useEffect(() => { const media = matchMedia('(min-width:1024px)'); const update = () => setDesktop(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  const mapView = desktop || props.mapView;
  const setMapView = props.onMapViewChange;
  const c = (ko: string, en: string) => locale === "en" ? en : ko;
  const { activeDay, tripDays, scheduleAssignments } = props.tripSelection;
  const itineraryPlaces = useMemo(() => props.tripSelection.orderedSavedPlaces.filter((place) => (scheduleAssignments[place.id] || tripDays[0]) === activeDay), [props.tripSelection.orderedSavedPlaces, activeDay, scheduleAssignments, tripDays]);
  const routableItineraryPlaces = useMemo(
    () => itineraryPlaces.filter(place => supportedPlacePoint(place.mapX, place.mapY)),
    [itineraryPlaces],
  );
  const navigationPlaces = routableItineraryPlaces;
  const [focusChoice, setFocusChoice] = useState('');
  const focusedPlaceId = itineraryPlaces.some(place => place.id === focusChoice) ? focusChoice : itineraryPlaces[0]?.id;
  function focusStop(place: MapPlace, fromMap = false) {
    const leg = props.coverage.legs.find(item => item.place.id === place.id && item.day === activeDay);
    if (!leg) return;
    setFocusChoice(place.id);
    if (fromMap) document.getElementById(`itinerary-stop-${place.id}`)?.scrollIntoView({ block: 'nearest' });
    if (leg.from && !leg.blocked) {
      const data = props.coverage.data[leg.key];
      if (data) props.route.displayRouteData(leg.place, leg.from, leg.fromLabel, data);
      else void props.route.loadRoutes(leg.place, leg.from, false, leg.fromLabel);
    }
  }
  function showStopOnMap(place: Place) {
    focusStop(place);
    setMapView(true);
    if (!desktop) requestAnimationFrame(() => {
      const heading = document.getElementById('navigation-title');
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
  const loadRoutes = props.route.loadRoutes;
  const resetRouteData = props.route.resetRouteData;
  const displayRouteData = props.route.displayRouteData;
  const { routeDestination, routeStart, routeStartIsPrivate, routeStartLabel, routeTravelMode } = props.route;
  const region = props.archiveContext.region;
  const structureSignature = `${region}|${activeDay}|${itineraryPlaces.map(place => `${place.id}:${place.mapX}:${place.mapY}`).join(',')}|${props.route.origin.lat},${props.route.origin.lng}|${props.route.privateOrigin}`;
  const previousRouteScope = useRef<{ structure: string; mode: typeof routeTravelMode; region: string } | null>(null);
  const pendingCoverageRoute = useRef<{ signature: string; key: string } | null>(null);

  useEffect(() => {
    if (!props.mapEnabled || !props.tripSelection.storageReady) return;
    if (!props.tripSelection.travelStart) {
      previousRouteScope.current = null;
      pendingCoverageRoute.current = null;
      if (routeDestination || routeStart) resetRouteData();
      return;
    }
    const previous = previousRouteScope.current;
    const sameStructure = previous?.structure === structureSignature;
    const sameMode = previous?.mode === routeTravelMode;
    previousRouteScope.current = { structure: structureSignature, mode: routeTravelMode, region };

    // A mode change already checks every itinerary leg. Reuse that exact leg
    // for the map; a separately chosen map journey still needs its own request.
    if (sameStructure && routeDestination && routeStart) {
      const point = supportedPlacePoint(routeDestination.mapX, routeDestination.mapY);
      const selectedLeg = props.coverage.legs.find(leg => leg.day === activeDay && !leg.blocked
        && !routeStartIsPrivate && leg.place.id === routeDestination.id
        && leg.from?.lat === routeStart.lat && leg.from?.lng === routeStart.lng
        && leg.to?.lat === point?.lat && leg.to?.lng === point?.lng);
      if (!sameMode) {
        if (selectedLeg) {
          const bundle = props.coverage.data[selectedLeg.key];
          // Coverage can finish while this tab is hidden. Consume it now:
          // no later coverage update would clear a newly added pending state.
          const pending = !bundle && (props.coverage.checkedSignature !== props.coverage.signature || props.coverage.loading);
          pendingCoverageRoute.current = pending ? { signature: props.coverage.signature, key: selectedLeg.key } : null;
          displayRouteData(routeDestination, routeStart, routeStartLabel, bundle || {}, pending);
        } else {
          pendingCoverageRoute.current = null;
          void loadRoutes(routeDestination, routeStart, routeStartIsPrivate, routeStartLabel);
        }
      } else if (pendingCoverageRoute.current) {
        const pending = pendingCoverageRoute.current;
        if (pending.signature !== props.coverage.signature || pending.key !== selectedLeg?.key) pendingCoverageRoute.current = null;
        else {
          const bundle = props.coverage.data[pending.key];
          if (bundle || (!props.coverage.loading && props.coverage.checkedSignature === pending.signature)) {
            pendingCoverageRoute.current = null;
            displayRouteData(routeDestination, routeStart, routeStartLabel, bundle || {});
          }
        }
      }
      return;
    }
    pendingCoverageRoute.current = null;

    // After a date, order or place change, use that date's current predecessor.
    // Never reuse the departure point from a different day's displayed journey.
    const currentLegs = props.coverage.legs.filter(leg => leg.day === activeDay && leg.from && leg.to);
    const leg = currentLegs.find(item => item.place.id === routeDestination?.id) || currentLegs[0];
    if (!leg?.from) {
      if (routeDestination || routeStart) resetRouteData();
      return;
    }
    const destinationPoint = routeDestination && supportedPlacePoint(routeDestination.mapX, routeDestination.mapY);
    const sameJourney = routeDestination?.id === leg.place.id
      && routeStart?.lat === leg.from.lat && routeStart?.lng === leg.from.lng
      && destinationPoint?.lat === leg.to?.lat && destinationPoint?.lng === leg.to?.lng
      && routeStartIsPrivate === leg.blocked;
    if (sameMode && previous?.region === region && sameJourney) return;
    void loadRoutes(leg.place, leg.from, leg.blocked, leg.fromLabel);
  }, [props.mapEnabled, props.tripSelection.storageReady, props.tripSelection.travelStart, props.coverage.legs, props.coverage.signature, props.coverage.checkedSignature, props.coverage.data, props.coverage.loading, activeDay, structureSignature, region, routeTravelMode, routeDestination, routeStart, routeStartIsPrivate, routeStartLabel, loadRoutes, resetRouteData, displayRouteData]);

  if (!props.tripSelection.travelStart) return <InitialTripSetup trip={props.tripSelection} />;
  return <section className="journey-workspace-block itinerary-stage" id="itinerary" aria-labelledby="itinerary-stage-title">
    <div lang="ko" className="simple-itinerary-heading"><div><h2 id="itinerary-stage-title">내 일정</h2><p>{props.tripSelection.travelStart} — {props.tripSelection.travelEnd}</p></div><button type="button" onClick={() => setSettingsOpen(true)}>여행 설정</button></div>
    {props.tripSelection.commandNotice && <div lang="ko" className="simple-command-receipt" role="status"><span>{props.tripSelection.commandNotice}</span>{props.tripSelection.canUndoCommand && <button type="button" onClick={() => props.tripSelection.undoCommand()}>되돌리기</button>}</div>}
    <Suspense fallback={<LoadingState>여행 도구를 준비하고 있어요.</LoadingState>}><TripDayPlanner plan={props.plan} tripSelection={props.tripSelection} route={props.route} audioGuide={props.audioGuide} participation={props.participation} archiveContext={props.archiveContext} /></Suspense>
    <Suspense fallback={null}><TravelExperience trip={props.tripSelection} coverage={props.coverage} origin={props.route.origin} region={props.archiveContext.region} onSelectPlace={props.onSelectPlace}/></Suspense>
    {!desktop && <div lang="ko" className="simple-map-switch" role="group" aria-label="일정 보기 방식"><button type="button" aria-pressed={!mapView} onClick={() => setMapView(false)}>시간표</button><button type="button" aria-pressed={mapView} onClick={() => setMapView(true)}>지도</button></div>}
    {(props.active || editorOpened) && <Suspense fallback={<LoadingState>{c("일정 편집을 준비하고 있어요.", "Preparing your itinerary.")}</LoadingState>}><PlannerItineraryBoard focusedPlaceId={focusedPlaceId} onFocusPlace={showStopOnMap} requiredKeys={props.plan?.criteria?.facilityKeys || []} trip={props.tripSelection} coverage={props.coverage} origin={props.route.origin} places={props.canAddPlaces ? [...props.activePlaces, ...(props.plan?.explorationPlaces || [])] : []} weather={props.weather} weatherLoading={props.weatherLoading} region={props.archiveContext.region} mapView={mapView} onSelectPlace={props.onSelectPlace} onContinue={props.onContinue} map={<NavigationWorkspace focusedPlaceId={focusedPlaceId} onPlaceFocus={place => focusStop(place, true)}
      mapEnabled={props.mapEnabled && mapView}
      compact
      activePlaces={navigationPlaces}
      planCrowd={props.planCrowd}
      effectiveProviders={props.effectiveProviders}
      route={props.route}
      locationSearch={props.locationSearch}
      onChoosePoint={props.onChoosePoint}
      onCopyBookingRoute={props.onCopyBookingRoute}
      onMapDestination={place => navigationPlaces.some(item => item.id === place.id) ? focusStop(place, true) : props.onMapDestination(place)}
      onSaveMapPlaces={props.onSaveMapPlaces}
    />} /></Suspense>}

    <details className="simple-more-trip-tools"><summary lang="ko">여행 도구</summary>{props.alternativeTools}
      <TripBudgetEntry trip={props.tripSelection} coverage={props.coverage} region={props.archiveContext.region}/>
      <TripDayTools onSelectPlace={props.onSelectPlace} trip={props.tripSelection} coverage={props.coverage} origin={props.route.origin} region={props.archiveContext.region}/>
      <details className="simple-audio-journal" onToggle={event => { setAudioOpen(event.currentTarget.open); if (!event.currentTarget.open) props.audioGuide.resetAudio(); }}><summary lang="ko">오디오 가이드·여행 후기</summary>{audioOpen && <Suspense fallback={<LoadingState>오디오를 준비하고 있어요.</LoadingState>}><AudioGuidePlayer audio={props.plan?.audio} controller={props.audioGuide}/></Suspense>}<Link lang="ko" href={buildTravelJournalHref({ places: props.tripSelection.orderedSavedPlaces.map(place => ({ id: place.id, name: place.name, day: props.tripSelection.scheduleAssignments[place.id] || props.tripSelection.tripDays[0] })), region: props.archiveContext.region, visitDate: props.tripSelection.tripDays[0] })}>여행 후기 작성</Link></details>
      <Suspense fallback={<LoadingState>이동 구간을 준비하고 있어요.</LoadingState>}><ItineraryRouteCoverage onOpenMap={() => setMapView(true)} coverage={props.coverage} route={props.route} trip={props.tripSelection} reviewed={props.reviewed} onReview={props.onReview} /></Suspense>
      <Suspense fallback={null}><SavedPlaceCoordinateRecovery key={`${props.archiveContext.region}|${tripDays}|${props.tripSelection.saved}`} places={props.tripSelection.orderedSavedPlaces} onRestore={props.tripSelection.rememberSavedPlaces} /></Suspense>
      {itineraryPlaces.some(place => !routableItineraryPlaces.includes(place)) && <p role="status">좌표가 없는 장소는 일정에 보관하고 지도에서 제외해요: {itineraryPlaces.filter(place => !routableItineraryPlaces.includes(place)).map(place => place.name).join(', ')}</p>}
    </details>
    {settingsOpen && <TripSettingsEditor trip={props.tripSelection} onClose={closeSettings} />}
  </section>;
}
