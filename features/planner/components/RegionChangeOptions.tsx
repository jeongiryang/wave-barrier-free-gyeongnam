"use client";

export default function RegionChangeOptions({ en, error, onAdd, onNew }: { en: boolean; error: boolean; onAdd: () => void; onNew: () => void }) {
  return <>
    <p>{en ? "Adding a region keeps the existing dates and order. Journeys between regions may be long and continue past midnight. Check every journey before leaving." : "지역을 추가하면 기존 날짜와 순서를 유지합니다. 지역 사이 이동은 길어지거나 자정을 넘길 수 있으니 모든 이동 구간을 확인해 주세요."}</p>
    <p>{en ? "Starting a new trip clears this device's current itinerary and route results. Trips already saved in your travel book are kept." : "새 여행을 시작하면 이 기기의 현재 일정과 경로 결과를 비웁니다. 여행집에 따로 보관한 여행은 유지합니다."}</p>
    {error && <p role="alert">{en ? "Your browser could not save this change. The current trip is kept. Allow local storage and try again, or cancel." : "변경 내용을 기기에 저장하지 못했어요. 현재 여행은 유지됩니다. 브라우저 저장을 허용한 뒤 다시 시도하거나 취소해 주세요."}</p>}
    <div><button type="button" onClick={onAdd}>{en ? "Add region to current itinerary" : "기존 일정에 지역 추가"}</button><button type="button" onClick={onNew}>{en ? "Start a new trip" : "새 여행으로 시작"}</button></div>
  </>;
}
