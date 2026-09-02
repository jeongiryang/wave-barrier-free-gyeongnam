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
  const itineraryPlaces = props.tripSelection.orderedSavedPlaces;
  const routableItineraryPlaces = useMemo(
    () => itineraryPlaces.filter((place) => (
      place.mapX.trim() !== "" && place.mapY.trim() !== ""
      && Number.isFinite(Number(place.mapX)) && Number.isFinite(Number(place.mapY))
    )),
    [itineraryPlaces],
  );
  const navigationPlaces = routableItineraryPlaces.length ? routableItineraryPlaces : props.activePlaces;
  const routeDestinationId = props.route.routeDestination?.id;
  const routeLoading = props.route.routeLoading;
  const loadRoutes = props.route.loadRoutes;
  const savedSignature = props.tripSelection.saved.join(",");
  const previousSavedSignature = useRef("");

  useEffect(() => {
    if (!routableItineraryPlaces.length) {
      previousSavedSignature.current = savedSignature;
      return;
    }
    if (previousSavedSignature.current === savedSignature || routeLoading) return;
    const previousSaved = new Set(previousSavedSignature.current.split(",").filter(Boolean));
    previousSavedSignature.current = savedSignature;
    if (routableItineraryPlaces.some((place) => place.id === routeDestinationId)) return;
    const addedPlace = routableItineraryPlaces.find((place) => !previousSaved.has(place.id));
    void loadRoutes(addedPlace || routableItineraryPlaces[0]);
  }, [loadRoutes, routeDestinationId, routeLoading, routableItineraryPlaces, savedSignature]);

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
