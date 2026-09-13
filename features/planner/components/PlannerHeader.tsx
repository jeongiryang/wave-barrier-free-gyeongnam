"use client";
import WaveHeader from "../../../components/WaveHeader";
import TripStorageNotice from "./TripStorageNotice";
import type { JourneyStepId } from "../hooks/useJourneyProgress";

export default function PlannerReferenceChrome({ savedCount, activeStep, onNavigate, interactive, storageSnapshot, onNew }: {
  savedCount: number; activeStep: JourneyStepId; interactive: boolean; storageSnapshot: Record<string, string>;
  onNavigate: (step: JourneyStepId) => void; onNew?: () => void;
}) {
  const itinerary = activeStep === "itinerary" || activeStep === "departure-readiness";
  return <><WaveHeader current="planner" savedCount={savedCount} onSaved={savedCount ? () => onNavigate("itinerary") : undefined} />
    <div lang="ko" className="simple-planner-heading"><h1>여행 설계</h1><div className="simple-planner-tabs" role="group" aria-label="여행 설계 화면">
      <button type="button" aria-pressed={!itinerary} disabled={!interactive} onClick={() => onNavigate("conditions")}>여행지 찾기</button>
      <button type="button" aria-pressed={itinerary} disabled={!interactive || !savedCount} onClick={() => onNavigate("itinerary")}>내 일정{savedCount > 0 ? ` · ${savedCount}곳` : ""}</button>
    </div>{onNew && <button className="simple-new-trip" type="button" disabled={!interactive} onClick={onNew}>새 여행</button>}</div>
    <div className="simple-storage-notice"><TripStorageNotice snapshot={storageSnapshot} /></div>
  </>;
}
