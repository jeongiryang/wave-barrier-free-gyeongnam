"use client";
import { lazy, Suspense, useState } from "react";
import type { Place } from "../types";
import LoadingState from "../../../components/LoadingState";
const SensoryMap = lazy(() => import("./SensoryMap"));
export default function PlaceSensory({ place }: { place: Place }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="place-evidence"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>지금 현장·감각 정보</summary>
      {open && (
        <Suspense
          fallback={<LoadingState>현장 정보를 확인하고 있어요.</LoadingState>}
        >
          <SensoryMap key={place.id} places={[place]} />
        </Suspense>
      )}
    </details>
  );
}
