"use client";
import { lazy, Suspense, useState } from "react";
import LoadingState from "../../../components/LoadingState";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { useItineraryRoutes } from "../hooks/useItineraryRoutes";
import type { RoutePoint } from "../../routing/types";
import type { Place } from "../types";
import styles from "./TravelExperience.module.css";
const SensoryMap = lazy(() => import("./SensoryMap"));
const TodayPace = lazy(() => import("./TodayPace"));
const CompanionLauncher = lazy(
  () => import("../../trips/components/CompanionLauncher"),
);
const TravelPassport = lazy(() => import("./TravelPassport"));
export type ExperienceProps = {
  trip: ReturnType<typeof useTripSelection>;
  coverage: ReturnType<typeof useItineraryRoutes>;
  origin: RoutePoint;
  region: string;
  onSelectPlace: (place: Place) => void;
};
export default function TravelExperience(props: ExperienceProps) {
  const [tab, setTab] = useState("");
  return (
    <section
      className={styles.experience}
      lang="ko"
      aria-label="오늘의 여행 도우미"
    >
      <div className={styles.actions}>
        {[
          ["pace", "오늘의 페이스"],
          ["sensory", "감각지도·지금 현장"],
          ["companion", "동행과 함께 편집"],
          ["passport", "경남 여행여권"],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-expanded={tab === id}
            aria-controls={`experience-${id}`}
            onClick={() => setTab(tab === id ? "" : id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab && (
        <div id={`experience-${tab}`}>
          <Suspense
            fallback={
              <LoadingState>여행 도우미를 준비하고 있어요.</LoadingState>
            }
          >
            {tab === "pace" ? (
              <TodayPace {...props} />
            ) : tab === "sensory" ? (
              <SensoryMap
                places={props.trip.orderedSavedPlaces}
                onSelectPlace={props.onSelectPlace}
              />
            ) : tab === "companion" ? (
              <CompanionLauncher trip={props.trip} region={props.region} />
            ) : (
              <TravelPassport
                places={props.trip.orderedSavedPlaces}
                region={props.region}
              />
            )}
          </Suspense>
        </div>
      )}
    </section>
  );
}
