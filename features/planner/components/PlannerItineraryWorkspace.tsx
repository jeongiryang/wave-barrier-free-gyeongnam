"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MapPlace } from "../../routing/types";
import type { useAudioGuide } from "../hooks/useAudioGuide";
import type { useLocationSearch } from "../hooks/useLocationSearch";
import type { usePlannerParticipation } from "../hooks/usePlannerParticipation";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place, PlanData, TransportProvider } from "../types";
import NavigationWorkspace from "./NavigationWorkspace";
import TripDayPlanner from "./TripDayPlanner";

interface PlannerItineraryWorkspaceProps {
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
  const { activeDay, setActiveDay, tripDays, scheduleAssignments } = props.tripSelection;
  const itineraryPlaces = useMemo(() => props.tripSelection.orderedSavedPlaces.filter((place) => (scheduleAssignments[place.id] || tripDays[0]) === activeDay), [props.tripSelection.orderedSavedPlaces, activeDay, scheduleAssignments, tripDays]);
  const routableItineraryPlaces = useMemo(
    () => itineraryPlaces.filter((place) => (
      place.mapX.trim() !== "" && place.mapY.trim() !== ""
      && Number.isFinite(Number(place.mapX)) && Number.isFinite(Number(place.mapY))
    )),
    [itineraryPlaces],
  );
  const navigationPlaces = routableItineraryPlaces;
  const loadRoutes = props.route.loadRoutes;
  const resetRouteData = props.route.resetRouteData;
  const savedSignature = `${activeDay}|${itineraryPlaces.map((place) => `${place.id}:${place.mapX}:${place.mapY}`).join(",")}|${props.route.origin.lat},${props.route.origin.lng}|${props.route.privateOrigin}`;
  const previousSavedSignature = useRef("");

  useEffect(() => {
    if (!routableItineraryPlaces.length) {
      resetRouteData();
      previousSavedSignature.current = savedSignature;
      return;
    }
    if (previousSavedSignature.current === savedSignature) return;
    previousSavedSignature.current = savedSignature;
    resetRouteData();
    void loadRoutes(routableItineraryPlaces[0]);
  }, [loadRoutes, routableItineraryPlaces, savedSignature, resetRouteData]);

  return <section className="journey-workspace-block itinerary-stage" id="itinerary" aria-labelledby="itinerary-stage-title">
    <div className="journey-subheading" data-reveal>
      <div><span aria-hidden="true">3</span><h2 id="itinerary-stage-title"><small>이 기기 일정 만들기</small>어떤 순서로 움직이면 편할까요?</h2></div>
      <p>추가한 장소의 날짜와 순서를 정하고 이동 경로를 확인하세요.</p>
    </div>
    <TripDayPlanner
      plan={props.plan}
      tripSelection={props.tripSelection}
      route={props.route}
      audioGuide={props.audioGuide}
      participation={props.participation}
      archiveContext={props.archiveContext}
    />
    <nav className="itinerary-day-tabs" aria-label="지도에 표시할 날짜">{tripDays.map((day) => <button type="button" key={day} aria-pressed={activeDay === day} onClick={() => setActiveDay(day)}>{day.slice(5).replace("-", "/")}</button>)}</nav>
    <p className="route-scope-note">{activeDay} · 일정 {itineraryPlaces.length}곳 중 지도에 표시할 수 있는 장소 {navigationPlaces.length}곳</p>
    {itineraryPlaces.some((place) => !routableItineraryPlaces.includes(place)) && <p role="status">좌표를 확인하지 못한 장소: {itineraryPlaces.filter((place) => !routableItineraryPlaces.includes(place)).map((place) => place.name).join(", ")}. 일정에는 그대로 보관하며 지도에서는 제외합니다.</p>}
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
