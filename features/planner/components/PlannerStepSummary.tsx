"use client";

import { useEffect, useState } from "react";
import type { Place } from "../types";

export default function PlannerStepSummary({ en, region, dates, activities, facilities, places, onQuestion, onItinerary }: {
  en: boolean; region: string; dates: string; activities: string; facilities: string; places: Place[];
  onQuestion: (question: number) => void; onItinerary: () => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const media = matchMedia("(min-width: 1101px)");
    const sync = () => setOpen(media.matches);
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return <aside className="condition-trip-summary"><details open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><span><small>YOUR TRIP</small><strong>{en ? "My journey" : "나의 여행"}</strong></span><b>{places.length}</b></summary>
    <div className="condition-trip-content"><dl>{[
      [en ? "Region" : "지역", region || (en ? "Choose a region" : "가고 싶은 지역"), 0],
      [en ? "Dates" : "날짜", dates, 3],
      [en ? "Activities" : "활동", activities || (en ? "Your kind of day" : "나에게 맞는 하루"), 0],
      [en ? "Facilities" : "편의", facilities || (en ? "Choose next" : "다음 단계에서 선택"), 1],
    ].map(([label, value, question]) => <div key={label}><dt>{label}</dt><dd><button type="button" disabled={question === 1 && !region} onClick={() => onQuestion(Number(question))} aria-label={`${label} ${en ? "edit" : "수정"}`}>{value}<span aria-hidden="true">↗</span></button></dd></div>)}</dl>
      {places.length ? <><ol>{places.slice(0, 3).map(place => <li key={place.id}>{place.name}</li>)}</ol><button type="button" className="reference-primary" onClick={onItinerary}>{en ? "Open my itinerary" : "내 일정 펼치기"} ↗</button></> : <p className="condition-trip-empty">{en ? <>Make room for the places<br />you want to stay.</> : <>좋아하는 곳을<br />하나씩 담아보세요.</>}</p>}
    </div>
  </details></aside>;
}
