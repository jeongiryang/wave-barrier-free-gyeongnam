"use client";
import { useSitePreferences } from "../../../components/SitePreferences";
import { lazy, Suspense } from "react";
import TripShareMenu from "./TripShareMenu";
import LoadingState from "../../../components/LoadingState";
import type { useAudioGuide } from "../hooks/useAudioGuide";
import type { usePlannerParticipation } from "../hooks/usePlannerParticipation";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { PlanData } from "../types";
function ArchiveUnavailable() {
  const { locale } = useSitePreferences(); const en = locale === 'en';
  return <div className="archive-unavailable" lang={en ? 'en' : 'ko'}><p role="alert">{en ? 'Saving tools could not load. You can keep editing your itinerary. Reload this page to restore saving.' : '저장 기능을 불러오지 못했어요. 일정은 계속 편집할 수 있어요. 화면을 다시 불러오면 저장을 다시 시도할 수 있어요.'}</p><button type="button" onClick={() => window.location.reload()}>{en ? 'Reload page' : '화면 다시 불러오기'}</button></div>;
}
const TravelBookArchiveAction = lazy(() => import("../../travel-book/TravelBookArchiveAction").catch(() => ({ default: ArchiveUnavailable })));

export default function TripDayPlanner({ tripSelection: trip, participation, archiveContext }: {
  itineraryRouteMinutes?: Record<string, number>; plan: PlanData | null; tripSelection: ReturnType<typeof useTripSelection>; route: ReturnType<typeof useRoutePlanning>;
  audioGuide: ReturnType<typeof useAudioGuide>; participation: ReturnType<typeof usePlannerParticipation>; archiveContext: { region: string; theme: string; profiles: string[] };
}) {
  return <div className="simple-trip-tools">
    <div className="simple-trip-actions">
      <Suspense fallback={<LoadingState>저장을 준비하고 있어요.</LoadingState>}><TravelBookArchiveAction compact places={trip.orderedSavedPlaces} region={archiveContext.region} theme={archiveContext.theme} profiles={archiveContext.profiles} travelStart={trip.travelStart} travelEnd={trip.travelEnd} dayStartTime={trip.dayStartTime} travelMode={trip.travelMode} scheduleAssignments={trip.scheduleAssignments} visitMinutesByPlaceId={trip.visitMinutesByPlaceId} fixedVisits={trip.fixedVisits} dayDeadlines={trip.dayDeadlines} comfort={trip.comfort} breakMinutesByPlaceId={trip.breakMinutesByPlaceId} restPurposeByPlaceId={trip.restPurposeByPlaceId} /></Suspense>
      <TripShareMenu trip={trip} participation={participation} region={archiveContext.region}/>
    </div>

  </div>;
}
