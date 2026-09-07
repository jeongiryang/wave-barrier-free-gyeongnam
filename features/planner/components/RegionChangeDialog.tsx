"use client";

import { regionNames } from "../../../lib/gyeongnam-region-names";
import { usePlaceDialogFocus } from "../hooks/usePlaceDialogFocus";

export default function RegionChangeDialog({ region, en, error, onCancel, onAdd, onNew }: {
  region: string; en: boolean; error: boolean;
  onCancel: () => void; onAdd: () => void; onNew: () => void;
}) {
  const ref = usePlaceDialogFocus(true, onCancel);
  return <dialog ref={ref} className="region-change-dialog" aria-labelledby="region-change-title" aria-describedby="region-change-description">
    <h2 id="region-change-title" tabIndex={-1}>{en ? `How would you like to visit ${regionNames[region] || region}?` : `${region} 여행을 어떻게 시작할까요?`}</h2>
    <p id="region-change-description">{en ? "Your itinerary already has places. Adding a region keeps their dates and order. Journeys between regions may be long and continue past midnight. Check every journey before leaving." : "이미 일정에 담긴 장소가 있어요. 지역을 추가하면 기존 날짜와 순서를 유지합니다. 지역 사이 이동은 길어지거나 자정을 넘길 수 있으니 모든 이동 구간을 확인해 주세요."}</p>
    <p>{en ? "Starting a new trip clears this device's current itinerary and route results. Trips already saved in your travel book are kept." : "새 여행을 시작하면 이 기기의 현재 일정과 경로 결과를 비웁니다. 여행집에 따로 보관한 여행은 유지합니다."}</p>
    {error && <p role="alert">{en ? "Your browser could not save this change. The current trip is kept. Allow local storage and try again, or cancel." : "변경 내용을 기기에 저장하지 못했어요. 현재 여행은 유지됩니다. 브라우저 저장을 허용한 뒤 다시 시도하거나 취소해 주세요."}</p>}
    <div><button type="button" onClick={onCancel}>{en ? "Cancel region change" : "지역 변경 취소"}</button><button type="button" onClick={onAdd}>{en ? "Add region to current itinerary" : "기존 일정에 지역 추가"}</button><button type="button" onClick={onNew}>{en ? "Start a new trip" : "새 여행으로 시작"}</button></div>
  </dialog>;
}
