"use client";
import { useSitePreferences } from "../../../components/SitePreferences";
import LandingScreenCapture from "./LandingScreenCapture";

const stops = [
  { id: "126117", name: "주남저수지 철새도래지", english: "Junam Reservoir" },
  { id: "2758443", name: "대산플라워랜드", english: "Daesan Flowerland" },
] as const;
const recording = {
  id: "production-eab2442-20260909-064600", source: { ko: "날짜와 카카오 지도는 2026년 9월 9일 06:55–06:58에 같은 여행에서 촬영했어요. 지도 속 사진 표지의 순위는 고른 날짜의 방문 순서예요.", en: "The itinerary and Kakao maps were recorded in one trip on 9 September 2026, 06:55–06:58 KST. Photo-marker numbers show the visit order for the selected day." },
  day1: { iso: "2026-09-09", ko: "9월 9일", en: "September 9" },
  day2: { iso: "2026-09-10", ko: "9월 10일", en: "September 10" },
} as const;
const recordedViews = {
  together: {
    phase: "before", date: recording.day1, stopIndexes: [0, 1],
    label: ["옮기기 전 · 첫날 두 곳", "Before · both on day one"],
    itinerary: { name: "timeline-before-itinerary", width: 441, height: 703 },
    map: { name: "timeline-before-map", width: 948, height: 1253 },
  },
  day1: {
    phase: "after", date: recording.day1, stopIndexes: [0],
    label: ["옮긴 뒤 · 첫날 주남", "After · Junam on day one"],
    itinerary: { name: "timeline-after-day1-itinerary", width: 441, height: 400 },
    map: { name: "timeline-after-day1-map", width: 948, height: 1254 },
  },
  day2: {
    phase: "after", date: recording.day2, stopIndexes: [1],
    label: ["옮긴 뒤 · 둘째 날 대산", "After · Daesan on day two"],
    itinerary: { name: "timeline-after-day2-itinerary", width: 442, height: 400 },
    map: { name: "timeline-after-day2-map", width: 948, height: 1254 },
  },
} as const;

/** Each dated state is visible in reading order. No explanation tabs or editing controls. */
export default function LandingJourneyScene() {
  const en = useSitePreferences().locale === "en";
  const copy = (ko: string, english: string) => en ? english : ko;
  return <>
    {(["itinerary", "map"] as const).map(kind => <section key={kind} className={`scroll-journey ${kind}-chapter`} data-cinematic={kind === "map" ? "wide" : "rise"} aria-labelledby={`${kind}-story-title`}>
      <header className="chapter-heading">
        <p className="section-kicker">{copy(kind === "itinerary" ? "날짜에서 일정으로" : "일정에서 지도로", kind === "itinerary" ? "From dates to an itinerary" : "From itinerary to map")}</p>
        <h2 id={`${kind}-story-title`}>{copy(kind === "itinerary" ? "가고 싶은 곳을,\n나의 하루에." : "같은 장소, 같은 순서.\n지도까지 이어지게.", kind === "itinerary" ? "Your places.\nYour own days." : "The same places and order.\nAll the way to the map.")}</h2>
        <p>{copy(kind === "itinerary" ? "두 곳을 하루에 담거나, 하루씩 나누거나. 날짜에 맞춰 나만의 여행을 구성해요." : "날짜를 바꾸면 그날의 장소가 지도에도 이어져요. 이동수단별 경로는 따로 확인하세요.", kind === "itinerary" ? "Keep two places together or give each its own day." : "Your day's places carry through to the map. Check each journey with your chosen transport.")}</p>
      </header>
      <div className="journey-sequence">
        {(["together", "day1", "day2"] as const).map(key => {
          const view = recordedViews[key];
          const places = view.stopIndexes.map(index => stops[index]);
          return <figure key={key} data-recording={recording.id} data-phase={view.phase} data-date={view.date.iso} className="journey-dated-scene">
            <figcaption><span>{view.label[en ? 1 : 0]}</span><strong>{view.date[en ? "en" : "ko"]}</strong></figcaption>
            <LandingScreenCapture {...view[kind]} alt={`${view.label[0]} ${view.date.ko} ${places.map(place => place.name).join(' 다음 ')}. 실제 ${kind === 'map' ? '카카오 지도' : '일정'} 화면. 시간은 직선거리 추정.`} />
            <ol className="journey-visible-stops">
              {places.map(place => <li key={place.id} data-place-id={place.id} data-map-place-id={kind === "map" ? place.id : undefined}>{copy(place.name, place.english)}</li>)}
            </ol>
          </figure>;
        })}
      </div>
      {kind === "map" && <p className="chapter-note">{copy("표시된 시간은 직선거리 추정이에요. 실제 길과 필요한 편의는 출발 전에 다시 확인하세요.", "Displayed times are straight-line estimates. Recheck actual routes and facilities before leaving.")}</p>}
    </section>)}
  </>;
}
