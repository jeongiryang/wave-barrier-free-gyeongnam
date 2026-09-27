"use client";
import NightIcon from "../../../components/NightIcon";
import { lazy, Suspense, useId } from "react";
import type { Place, WeatherData } from "../types";
import { originalLanguage } from "../place-copy";
import { sceneryGuidance } from "../weather-copy";
import PlaceFacilitySummary from "./PlaceFacilitySummary";
const SmartSpotImage = lazy(() => import("../../tourism/components/SmartSpotImage").catch(() => ({ default: () => <span className="simple-photo-placeholder" role="status">사진을 불러오지 못했어요</span> })));

export default function PlaceResultRow({ place, region, saved, current, en, unknown = false, weather, weatherDate, onToggle, onDetails, compare }: {
  place: Place; region: string; saved: boolean; current: boolean; en: boolean; unknown?: boolean; weather?: WeatherData | null; weatherDate?: string;
  onToggle?: () => void; onDetails: () => void;
  compare?: { selected: boolean; disabled: boolean; toggle: () => void };
}) {
  const id = useId();
  const say = (ko: string, english: string) => en ? english : ko;
  const forecast = weather?.days.find(day => day.date === weatherDate);
  const hint = sceneryGuidance(forecast, place.setting?.state === 'indoor-space' ? 'indoor' : 'unknown', en);
  return <article className="simple-place-row" aria-labelledby={id} data-result-current={current}>
    <header className="simple-place-heading"><span className="simple-place-city" lang={originalLanguage(place.city || region)}>{place.city || region}</span>
      <h3 id={id} lang={originalLanguage(place.name)}><button type="button" onClick={onDetails}>{place.name}</button></h3>
</header>
    <button type="button" className="simple-place-photo" onClick={onDetails} title={say("자세히 보기", "View details")} aria-label={`${place.name} ${say("상세 보기", "details")}`}>
      <Suspense fallback={<span className="simple-photo-placeholder" aria-hidden="true" />}><SmartSpotImage src={place.image} title={place.name} region={place.city || region} contentId={place.id} tag="" rank={0} showMeta={false} /></Suspense>
    </button>
    <div className="simple-place-copy">
      <p className="simple-place-address" lang={originalLanguage(place.address)}>{place.address}</p>
      <PlaceFacilitySummary place={place} en={en} highlightConfirmed={unknown} />
      {hint && <p className="scenery-hint"><span>{hint.text}</span><small>{hint.source}</small></p>}
      {compare && <label className="simple-compare-check"><input type="checkbox" checked={compare.selected} disabled={compare.disabled} onChange={compare.toggle} />{say("비교", "Compare")}</label>}
    </div>
    <div className="place-card-actions"><span role="status" className="place-save-feedback">{saved ? say("담았습니다", "Added to itinerary") : ""}</span>{<button type="button" data-icon-action="" className="place-card-info" onClick={onDetails} aria-label={`${place.name} ${say("상세정보", "place information")}`} title={say("자세히 보기", "View details")}><NightIcon name="info" size={20}/></button>}
    <button type="button" className="simple-place-add" title={saved ? say("담았습니다 · 되돌리기", "Added · undo") : unknown ? say("편의 확인 후 담기", "Review facilities and add") : say("일정에 담기", "Add to itinerary")} disabled={!unknown && !saved && !current} aria-pressed={saved} onClick={saved ? onToggle : unknown ? onDetails : onToggle} aria-label={`${place.name} ${unknown && !saved ? say("편의 확인", "review facilities") : saved ? say("담았음 · 되돌리기", "added · undo") : say("일정에 담기", "add to itinerary")}`}>
      <NightIcon name={saved ? "check" : "plus"} size={20}/>
    </button></div>
  </article>;
}
