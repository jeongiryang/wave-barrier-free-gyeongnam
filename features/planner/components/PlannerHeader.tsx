"use client";
import NaruHeaderScene from "../../../components/NaruHeaderScene";
import WaveHeader from "../../../components/WaveHeader";
import TripStorageNotice from "./TripStorageNotice";
import type { JourneyStepId } from "../hooks/useJourneyProgress";

export default function PlannerReferenceChrome({ savedCount, storageReady, onNavigate, storageSnapshot, onNew }: {
  savedCount: number; storageReady: boolean; storageSnapshot: Record<string, string>;
  onNavigate: (step: JourneyStepId) => void; onNew: () => void;
}) {
  return <><div className="planner-welcome-header"><WaveHeader current="planner" savedReady={storageReady} onSearch={() => onNavigate("places")} onNew={onNew} savedCount={savedCount} onSaved={savedCount ? () => onNavigate("itinerary") : undefined} />
    <h1 className="sr-only">여행 설계</h1><NaruHeaderScene />
    </div><div className="simple-storage-notice"><TripStorageNotice snapshot={storageSnapshot} /></div>
  </>;
}
