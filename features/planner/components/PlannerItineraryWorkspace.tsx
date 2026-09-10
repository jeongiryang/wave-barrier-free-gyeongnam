"use client";

import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import { supportedPlacePoint } from "../../../lib/map-coordinates.js";
import type { MapPlace } from "../../routing/types";
import type { useAudioGuide } from "../hooks/useAudioGuide";
import type { useLocationSearch } from "../hooks/useLocationSearch";
import type { usePlannerParticipation } from "../hooks/usePlannerParticipation";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place, PlanData, TransportProvider } from "../types";
import NavigationWorkspace from "./NavigationWorkspace";
import type { useItineraryRoutes } from "../hooks/useItineraryRoutes";

const ItineraryRouteCoverage = lazy(() => import("./ItineraryRouteCoverage"));
const SavedPlaceCoordinateRecovery = lazy(() => import("./SavedPlaceCoordinateRecovery"));
function ItineraryUnavailable() {
  const { locale } = useSitePreferences();
  return <p role="status">{locale === "en" ? "The itinerary editor couldn't open. Try reloading this page." : "일정 편집 화면을 열지 못했습니다. 페이지를 새로 열어 다시 시도해 주세요."}</p>;
}
const TripDayPlanner = lazy(() => import("./TripDayPlanner").catch(() => ({ default: ItineraryUnavailable })));

interface PlannerItineraryWorkspaceProps {
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
  archiveContext: { region: string; theme: string; profiles: string[] };
  onChoosePoint: (place: Place) => void;
  onCopyBookingRoute: (provider: string) => Promise<void>;
  onMapDestination: (place: MapPlace) => void;
  onSaveMapPlaces: (places: MapPlace[]) => number;
}

export default function PlannerItineraryWorkspace(props: PlannerItineraryWorkspaceProps) {
  const { locale } = useSitePreferences();
  const c = (ko: string, en: string) => locale === "en" ? en : ko;
  const { activeDay, setActiveDay, tripDays, scheduleAssignments } = props.tripSelection;
  const itineraryPlaces = useMemo(() => props.tripSelection.orderedSavedPlaces.filter((place) => (scheduleAssignments[place.id] || tripDays[0]) === activeDay), [props.tripSelection.orderedSavedPlaces, activeDay, scheduleAssignments, tripDays]);
  const routableItineraryPlaces = useMemo(
    () => itineraryPlaces.filter(place => supportedPlacePoint(place.mapX, place.mapY)),
    [itineraryPlaces],
  );
  const navigationPlaces = routableItineraryPlaces;
  const loadRoutes = props.route.loadRoutes;
  const resetRouteData = props.route.resetRouteData;
  const savedSignature = `${activeDay}|${itineraryPlaces.map((place) => `${place.id}:${place.mapX}:${place.mapY}`).join(",")}|${props.route.origin.lat},${props.route.origin.lng}|${props.route.privateOrigin}`;
  const previousSavedSignature = useRef("");
  const previousTripSignature = useRef("");
  const tripSignature = props.coverage.signature;

  useEffect(() => {
    if (!routableItineraryPlaces.length) {
      resetRouteData();
      previousSavedSignature.current = savedSignature;
      return;
    }
    if (previousSavedSignature.current === savedSignature) return;
    previousSavedSignature.current = savedSignature;
    const sameTrip = previousTripSignature.current === tripSignature;
    previousTripSignature.current = tripSignature;
    if (sameTrip && itineraryPlaces.some((place) => place.id === props.route.routeDestination?.id) && props.route.routeStart) return;
    resetRouteData();
    void loadRoutes(routableItineraryPlaces[0]);
  }, [loadRoutes, routableItineraryPlaces, savedSignature, resetRouteData, tripSignature, itineraryPlaces, props.route.routeDestination, props.route.routeStart]);

  return <section className="journey-workspace-block itinerary-stage" id="itinerary" aria-labelledby="itinerary-stage-title">
    <div className="journey-subheading" data-reveal>
      <div><span aria-hidden="true">3</span><h2 id="itinerary-stage-title"><small>{c("내 일정", "My itinerary")}</small>{c("어떤 순서로 움직이면 편할까요?", "What order works for your trip?")}</h2></div>
      <p>{c("추가한 장소의 날짜와 순서를 정하고 이동 경로를 확인하세요. 완성한 일정은 여행집에 보관할 수 있어요.", "Arrange dates and order, then check the journeys between places. Keep your completed itinerary in your travel book.")}</p>
    </div>
    {props.tripSelection.orderedSavedPlaces.length ? <Suspense fallback={<p role="status">{c("일정 편집을 준비하고 있어요.", "Preparing your itinerary.")}</p>}><TripDayPlanner
      itineraryRouteMinutes={props.coverage.routeMinutes}
      plan={props.plan}
      tripSelection={props.tripSelection}
      route={props.route}
      audioGuide={props.audioGuide}
      participation={props.participation}
      archiveContext={props.archiveContext}
    /></Suspense> : <section className="day-planner empty" data-reveal aria-label={c("내 일정", "My itinerary")}>
      <div className="itinerary-empty-state"><span aria-hidden="true">+</span><h3>{c("아직 일정에 추가한 장소가 없어요.", "No places in your itinerary yet.")}</h3><p>{c("위 추천 여행지에서 ‘일정에 추가’를 누르면 이곳에서 날짜, 순서와 이동시간을 정리할 수 있습니다.", "Add a recommended place to arrange its date, order and travel time here.")}</p></div>
    </section>}
    {props.tripSelection.orderedSavedPlaces.length > 0 && <Suspense fallback={<p role="status">{c("이동 구간 확인을 준비하고 있어요.", "Preparing journey checks.")}</p>}><ItineraryRouteCoverage coverage={props.coverage} route={props.route} trip={props.tripSelection} reviewed={props.reviewed} onReview={props.onReview} /></Suspense>}
    <nav className="itinerary-day-tabs" aria-label={c("지도에 표시할 날짜", "Date to show on the map")}>{tripDays.map((day) => <button type="button" key={day} aria-pressed={activeDay === day} onClick={() => setActiveDay(day)}>{day.slice(5).replace("-", "/")}</button>)}</nav>
    <p className="route-scope-note">{activeDay} · {c(`일정 ${itineraryPlaces.length}곳 중 지도에 표시할 수 있는 장소 ${navigationPlaces.length}곳`, `${navigationPlaces.length} of ${itineraryPlaces.length} itinerary places can be shown on the map`)}</p>
    <Suspense fallback={null}><SavedPlaceCoordinateRecovery key={`${props.archiveContext.region}|${tripDays}|${props.tripSelection.saved}`} places={props.tripSelection.orderedSavedPlaces} onRestore={props.tripSelection.rememberSavedPlaces} /></Suspense>
    {itineraryPlaces.some((place) => !routableItineraryPlaces.includes(place)) && <p role="status">{c("좌표를 확인하지 못한 장소:", "Coordinates unavailable:")} {itineraryPlaces.filter((place) => !routableItineraryPlaces.includes(place)).map((place) => place.name).join(", ")}. {c("일정에는 그대로 보관하며 지도에서는 제외합니다.", "Kept in your itinerary, but excluded from the map.")}</p>}
    <NavigationWorkspace
      mapEnabled={props.mapEnabled}
      activePlaces={navigationPlaces}
      planCrowd={props.planCrowd}
      effectiveProviders={props.effectiveProviders}
      route={props.route}
      locationSearch={props.locationSearch}
      onChoosePoint={props.onChoosePoint}
      onCopyBookingRoute={props.onCopyBookingRoute}
      onMapDestination={props.onMapDestination}
      onSaveMapPlaces={props.onSaveMapPlaces}
    />
  </section>;
}
