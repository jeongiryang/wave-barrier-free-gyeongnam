"use client";

import { lazy, Suspense } from "react";
import { regionNames } from "../../../lib/gyeongnam-region-names";
import { usePlaceDialogFocus } from "../hooks/usePlaceDialogFocus";

const Options = lazy(() => import("./RegionChangeOptions").catch(() => ({ default: ({ en }: { en: boolean }) => <p role="alert">{en ? "The choices could not load. Cancel and reload the page to try again. Your itinerary is kept." : "선택 항목을 불러오지 못했어요. 취소하고 페이지를 새로 열어 다시 시도해 주세요. 일정은 유지됩니다."}</p> })));

export default function RegionChangeDialog({ region, en, error, onCancel, onAdd, onNew }: {
  region: string; en: boolean; error: boolean;
  onCancel: () => void; onAdd: () => void; onNew: () => void;
}) {
  const ref = usePlaceDialogFocus(true, onCancel);
  return <dialog ref={ref} lang={en ? "en" : "ko"} className="region-change-dialog" aria-labelledby="region-change-title" aria-describedby="region-change-description">
    <h2 id="region-change-title" tabIndex={-1}>{en ? `How would you like to visit ${regionNames[region] || region}?` : `${region} 여행을 어떻게 시작할까요?`}</h2>
    <p id="region-change-description">{en ? "Your itinerary already has places. Choose how to continue." : "이미 일정에 담긴 장소가 있어요. 계속할 방법을 선택해 주세요."}</p>
    <button type="button" onClick={onCancel}>{en ? "Cancel region change" : "지역 변경 취소"}</button>
    <Suspense fallback={<p role="status">{en ? "Loading choices…" : "선택 항목을 불러오는 중…"}</p>}><Options en={en} error={error} onAdd={onAdd} onNew={onNew} /></Suspense>
  </dialog>;
}
