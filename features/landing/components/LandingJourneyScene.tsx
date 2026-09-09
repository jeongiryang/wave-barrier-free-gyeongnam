"use client";

import { useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";

// Dated states are one actual Production recording; see timeline-manifest.json.
const media = "/media/wave-journey/";
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
const steps = [
  ["편의와 추천", "Needs & places", "필요한 편의에서, 가고 싶은 장소로", "From your needs to real places"],
  ["날짜와 일정", "Date & itinerary", "날짜를 고르면, 하루가 달라져요", "A different day for each place"],
  ["지도와 이동", "Map & journeys", "그날의 장소가 지도에도 이어져요", "The day's places carry through to the map"],
  ["출발 전 확인", "Before leaving", "아직 모르는 정보까지 확인해요", "Check what is still unconfirmed"],
] as const;

function Capture({ name, width, height, alt }: { name: string; width: number; height: number; alt: string }) {
  const en = useSitePreferences().locale === "en";
  const [failed, setFailed] = useState(false);
  return <div className="journey-capture-frame" style={{ maxWidth: width, aspectRatio: `${width}/${height}` }}>
    {failed ? <p role="status">{en ? "This recorded screen could not load. Place information and the planning link are still available." : "촬영 화면을 불러오지 못했어요. 장소 정보와 여행 시작 링크는 계속 사용할 수 있어요."}</p>
      : <img className="journey-capture" src={`${media}${name}.webp`} width={width} height={height} loading="lazy" decoding="async" lang="ko" alt={alt}
        ref={node => { if (node?.complete && !node.naturalWidth) setFailed(true); }} onError={() => setFailed(true)} />}
  </div>;
}

export default function LandingJourneyScene() {
  const { locale, t } = useSitePreferences();
  const en = locale === "en";
  const [step, setStep] = useState(0);
  const [recordedView, setRecordedView] = useState<keyof typeof recordedViews>("together");
  const copy = (ko: string, english: string) => en ? english : ko;
  const selected = recordedViews[recordedView];
  const datedStage = step === 1 || step === 2;
  const visibleStops = datedStage ? selected.stopIndexes.map(index => stops[index]) : stops;
  const orderedNames = visibleStops.map(stop => copy(stop.name, stop.english)).join(copy(" 다음 ", " then "));
  const recordedTitle = copy(selected.phase === "before" ? "옮기기 전" : "옮긴 뒤", selected.phase === "before" ? "Before" : "After") + " · " + selected.date[en ? "en" : "ko"] + " · " + orderedNames;
  const imageAlt = (selected.phase === "before" ? "대산플라워랜드 날짜 이동 전" : "대산플라워랜드 날짜 이동 후") + ", " + selected.date.ko + " " + visibleStops.map((stop, index) => stop.name + " " + (index + 1) + "번").join(" 다음 ") + "인 같은 시연의 실제 " + (step === 2 ? "지도" : "일정") + ". 이동 시간은 직선거리 추정이며 실제 경로 성공을 뜻하지 않습니다.";

  return <section className="journey-scene" aria-labelledby="journey-scene-title" lang={locale}>
    <div className="journey-scene-copy" data-land-reveal>
      <p className="section-kicker">{copy("창원에서 확인한 실제 여행 계획", "A real planning example in Changwon")}</p>
      <h2 id="journey-scene-title">{copy("가고 싶은 두 곳.", "Two places to visit.")}<br /><em>{copy("내가 고르는 하루.", "A day you choose.")}</em></h2>
      <p>{copy("필요한 편의를 살펴보고, 여행지를 날짜에 담으세요. 날짜를 나누면 일정과 지도에서 그날의 장소를 함께 볼 수 있어요.", "Review the facilities you need and place each stop on a day. The itinerary and map show the same places for that day.")}</p>
      <a href="/planner?region=%EC%B0%BD%EC%9B%90">{t("plan", "내 여행 계획하기")} <span aria-hidden="true">↗</span></a>
      <details id="journey-record-source" className="journey-source-details">
        <summary>{copy("출처와 확인 시점", "Sources and recorded times")}</summary>
        <p>{copy("관광사진·편의정보 출처: ⓒ한국관광공사. 공식 기록을 보여주며 접근성을 인증하지 않아요. 대산플라워랜드 자료 조회는 2026년 9월 9일 02:26:57입니다. 조회 시각은 시설 갱신일이 아니에요.", "Photos and facility records: ⓒKorea Tourism Organization. These are records, not an accessibility certification. The Daesan record was retrieved on 9 September 2026 at 02:26:57 KST, not the facility update date.")}</p>
        <p>{copy("날짜와 지도는 같은 여행에서 대산플라워랜드를 둘째 날로 옮긴 전후 기록이에요. 아래 버튼은 촬영된 화면을 선택하며 내 여행을 편집하거나 최신 정보를 조회하지 않아요.", "The itinerary and maps record the same trip before and after moving Daesan to day two. These buttons select recorded screens; they do not edit your trip or request live information.")}</p>
        <p>{recording.source[en ? "en" : "ko"]}</p>
        <p>{copy("이동 시간은 직선거리 추정이며 실제 길찾기 결과가 아니에요. 방문 전 시설과 경로를 다시 확인하세요.", "Travel times are straight-line estimates, not verified routes. Recheck facilities and routes before visiting.")}</p>
      </details>
    </div>
    <figure className="journey-scene-visual journey-stage" data-land-reveal>
      <div className="journey-stage-controls" role="group" aria-label={copy("여행 계획 소개 단계 선택", "Choose a planning step")}>
        {steps.map((item, index) => <button key={item[0]} type="button" aria-pressed={step === index} aria-controls="journey-stage-panel" onClick={() => setStep(index)}>
          <b aria-hidden="true">{index + 1}</b>{item[en ? 1 : 0]}
        </button>)}
      </div>
      <div className="journey-day"><span>{copy("실제 화면으로 보는 여행 계획", "A recorded planning example")}</span><strong aria-hidden="true">0{step + 1}</strong><p id="journey-stage-title" aria-live="polite" aria-atomic="true">{datedStage ? recordedTitle : steps[step][en ? 3 : 2]}</p></div>
      {datedStage && <div className="journey-date-controls" role="group" aria-label={copy("같은 시연의 날짜별 기록 선택", "Choose a dated state from the same recording")}>
        {(["together", "day1", "day2"] as const).map(key => <button key={key} type="button" aria-pressed={recordedView === key} aria-controls="journey-stage-panel" onClick={() => setRecordedView(key)}>{recordedViews[key].label[en ? 1 : 0]}</button>)}
      </div>}
      <div key={step + ":" + (datedStage ? recordedView : "overview")} id="journey-stage-panel" className="journey-stage-board" role="region" aria-labelledby="journey-stage-title">
        {step === 0 && <>
          <p>{copy("접근로와 승강기를 선택한 창원 여행이에요. 실제 관광사진과 확인된 편의, 미확인 정보를 함께 살펴보세요.", "This Changwon example uses the access-path and lift facilities option. Compare real photos, recorded facilities and unconfirmed information.")}</p>
          <Capture name="places-two" width={833} height={546} alt="창원 대산플라워랜드와 주남저수지의 실제 관광사진과 편의 기록, 미확인 안내. 한국관광공사 사진 워터마크를 유지합니다." />
          <details className="journey-source-details">
            <summary>{copy("선택한 편의와 대산플라워랜드 근거 보기", "View the selected facilities and Daesan's records")}</summary>
            <Capture name="conditions" width={923} height={314} alt="접근로와 승강기 편의 묶음 하나를 선택한 실제 화면." />
            <dl className="journey-review" data-place-evidence="2758443">
              <div><dt>{copy("확인 2", "2 recorded")}</dt><dd>{copy("완만한 접근로 · 화장실", "Access path · toilet")}</dd></div>
              <div><dt>{copy("미확인 1", "1 unconfirmed")}</dt><dd>{copy("승강기 정보가 없어 시설에 확인이 필요해요.", "Lift information is missing. Ask the venue before visiting.")}</dd></div>
            </dl>
            <p>{copy("공식 기록에 있다는 뜻이며 현장 접근성을 인증하거나 보장하지 않아요.", "These are official records, not an accessibility certification or guarantee.")}</p>
            <Capture name="facility-record-source" width={529} height={709} alt="대산플라워랜드 확인2·미확인1·불일치0, 공식 시설 원문과 자료 조회2026년9월9일02:26:57." />
          </details>
        </>}
        {step === 1 && <>
          <p>{copy("하루에 담은 두 곳을 다른 날짜로 나눠 봤어요. 촬영된 기록을 골라 일정과 지도에서 같은 장소를 확인해 보세요.", "We split the two places across two days. Choose a recorded state to compare the same places in the itinerary and map.")}</p>
          <Capture key={recordedView + ":itinerary"} {...selected.itinerary} alt={imageAlt} />
        </>}
        {step === 2 && <>
          <p>{copy("고른 날짜에 맞춰 장소와 순위도 달라져요. 이 화면의 이동 시간은 직선거리 추정이며 실제 길찾기 결과가 아니에요.", "The places and their order match the selected day. Travel times in this recording are straight-line estimates, not verified routes.")}</p>
          <Capture key={recordedView + ":map"} {...selected.map} alt={imageAlt} />
        </>}
        {step === 3 && <>
          <p>{copy("출발 전에는 필요한 시설과 이동, 여행 날짜의 날씨를 다시 살펴보세요. 확인하지 못한 정보를 완료로 표시하지 않아요.", "Before leaving, recheck the facilities, every journey and the weather for your dates. Unconfirmed information stays unconfirmed.")}</p>
          <dl className="journey-review">
            <div><dt>{copy("이동", "Journeys")}</dt><dd>{copy("이 시연의 시간은 직선거리 추정 · 실제 경로 재확인 필요", "This recording uses straight-line estimates · recheck the actual routes")}</dd></div>
            <div><dt>{copy("편의", "Facilities")}</dt><dd>{copy("대산플라워랜드 승강기 미확인 · 방문 전 시설 문의", "Daesan lift information is unconfirmed · ask the venue before visiting")}</dd></div>
            <div><dt>{copy("날씨", "Weather")}</dt><dd>{copy("내 여행 날짜의 최신 예보 확인", "Check the latest forecast for your travel dates")}</dd></div>
          </dl>
        </>}
        <ol className="journey-scene-stops" data-recording={datedStage ? recording.id : undefined} data-date={datedStage ? selected.date.iso : undefined} data-phase={datedStage ? selected.phase : undefined} aria-label={datedStage ? recordedTitle : copy("창원 여행의 두 장소", "Two places in the Changwon trip")}>
          {visibleStops.map((stop, index) => <li key={stop.id} data-place-id={stop.id} data-map-place-id={step === 2 ? stop.id : undefined}>
            <b aria-hidden="true">{index + 1}</b><span><strong>{copy(stop.name, stop.english)}</strong><small>{datedStage ? selected.date[en ? "en" : "ko"] : copy("창원", "Changwon")}</small></span>
          </li>)}
        </ol>
      </div>
      <figcaption>{copy("2026년 9월 9일 실제 한국어 화면 · 여행 시작 링크에서 내 계획을 만들 수 있어요.", "Actual Korean screens recorded on 9 September 2026 · create your plan using the planning link.")}</figcaption>
    </figure>
  </section>;
}
