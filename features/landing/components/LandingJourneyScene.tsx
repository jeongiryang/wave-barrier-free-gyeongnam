"use client";

import { useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";

const media = "/media/wave-journey/";
// The default date and map use the SAME 03:08 KST public recording.
const stops = [
  { id: "126117", name: "주남저수지 철새도래지", english: "Junam Reservoir" },
  { id: "2758443", name: "대산플라워랜드", english: "Daesan Flowerland" },
] as const;
const steps = [
  ["편의와 추천", "Needs & places", "필요한 편의에서, 가고 싶은 장소로", "From your needs to real places"],
  ["날짜와 일정", "Date & itinerary", "같은 하루에 두 장소를 담아요", "Two real places, one day"],
  ["지도와 이동", "Map & journeys", "고른 장소와 순서가 지도에서도 같아요", "The same places and order on the map"],
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
  const [splitExample, setSplitExample] = useState(false);
  const copy = (ko: string, english: string) => en ? english : ko;

  return <section className="journey-scene" aria-labelledby="journey-scene-title" lang={locale}>
    <div className="journey-scene-copy" data-land-reveal>
      <p className="section-kicker">{copy("창원에서 확인한 실제 여행 계획", "A real planning example in Changwon")}</p>
      <h2 id="journey-scene-title">{copy("가고 싶은 두 곳.", "Two places to visit.")}<br /><em>{copy("내가 고르는 하루.", "A day you choose.")}</em></h2>
      <p>{copy("필요한 편의를 살펴보고, 여행지를 날짜에 담으세요. 같은 장소와 순서를 지도에서 확인할 수 있어요.", "Review the facilities you need and place each stop on a day. Check the same places and order on the map.")}</p>
      <a href="/planner?region=%EC%B0%BD%EC%9B%90">{t("plan", "내 여행 계획하기")} <span aria-hidden="true">↗</span></a>
      <details id="journey-record-source" className="journey-source-details">
        <summary>{copy("출처와 확인 시점", "Sources and when we checked")}</summary>
        <p>{copy("관광사진·편의정보 출처: ⓒ한국관광공사. 공식 기록을 보여주며 접근성을 인증하지 않아요. 대산플라워랜드 자료 조회는 2026년 9월 9일 02:26:57입니다. 조회 시각은 시설 갱신일이 아니에요.", "Photos and facility records: ⓒKorea Tourism Organization. These are records, not an accessibility certification. The Daesan record was retrieved on 9 September 2026 at 02:26:57 KST, not the facility update date.")}</p>
        <p>{copy("일정과 지도는 같은 날 03:08에 촬영한 한 시연의 주남저수지→대산플라워랜드 순서예요. 카카오 지도에 두 장소가 보이는 범위만 확인했고, 이동 시간은 직선거리 추정입니다. 방문 전 시설과 경로를 다시 확인하세요.", "The itinerary and map show the same 03:08 KST recording, ordered Junam then Daesan. Both places were visible on Kakao; displayed travel times are straight-line estimates. Recheck facilities and routes before visiting.")}</p>
      </details>
    </div>
    <figure className="journey-scene-visual journey-stage" data-land-reveal>
      <div className="journey-stage-controls" role="group" aria-label={copy("여행 계획 소개 단계 선택", "Choose a planning step")}>
        {steps.map((item, index) => <button key={item[0]} type="button" aria-pressed={step === index} aria-controls="journey-stage-panel" onClick={() => setStep(index)}>
          <b aria-hidden="true">{index + 1}</b>{item[en ? 1 : 0]}
        </button>)}
      </div>
      <div className="journey-day"><span>{copy("실제 화면으로 보는 여행 계획", "A recorded planning example")}</span><strong aria-hidden="true">0{step + 1}</strong><p id="journey-stage-title" aria-live="polite" aria-atomic="true">{steps[step][en ? 3 : 2]}</p></div>
      <div key={step} id="journey-stage-panel" className="journey-stage-board" role="region" aria-labelledby="journey-stage-title">
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
          <p>{copy("9월 9일에는 주남저수지 다음 대산플라워랜드를 담았어요. 내 날짜와 순서는 실제 여행 계획에서 바꿀 수 있어요.", "The September 9 itinerary visits Junam, then Daesan. Set your own dates and order in the planner.")}</p>
          <Capture name="map-matching-itinerary" width={893} height={703} alt="2026년9월9일 주남저수지1번·대산플라워랜드2번인 실제 일정. 다음 지도와 같은 시연이며 이동 시간은 직선거리 추정입니다." />
          <details className="journey-source-details">
            <summary>{copy("날짜를 나눈 다른 실제 시연 보기", "See another recording with separate travel days")}</summary>
            <p>{copy("02:29에 촬영한 별도 시연이에요. 날짜 변경 전후를 선택해 볼 수 있으며, 기본 지도 시연의 날짜나 순서를 바꾸지는 않아요.", "This separate 02:29 KST recording shows a date change. These buttons select recorded states; they do not change the main map example.")}</p>
            <div className="journey-date-controls" role="group" aria-label={copy("촬영된 날짜 배정 선택", "Choose a recorded date assignment")}>
              <button type="button" aria-pressed={!splitExample} aria-controls="journey-date-recording" onClick={() => setSplitExample(false)}>{copy("9월 9일에 두 곳", "Both on September 9")}</button>
              <button type="button" aria-pressed={splitExample} aria-controls="journey-date-recording" onClick={() => setSplitExample(true)}>{copy("9월 9·10일로 나누기", "Split September 9–10")}</button>
            </div>
            <div id="journey-date-recording" data-recording="journey-0229" data-split={splitExample}>
              <p role="status">{splitExample ? copy("9월 9일 주남저수지 · 9월 10일 대산플라워랜드", "Junam on September 9 · Daesan on September 10") : copy("9월 9일 대산플라워랜드 다음 주남저수지", "September 9: Daesan, then Junam")}</p>
              <Capture key={String(splitExample)} name={splitExample ? "date-after" : "date-before"} width={893} height={splitExample ? 403 : 706} alt={splitExample ? "대산플라워랜드를9월10일로 옮기고 주남저수지는9월9일에 남긴 실제 결과. 직선거리 추정 표기를 유지합니다." : "9월9일 대산플라워랜드 다음 주남저수지로 담긴 실제 일정. 직선거리 추정 표기를 유지합니다."} />
            </div>
          </details>
        </>}
        {step === 2 && <>
          <p>{copy("같은 9월 9일 일정의 주남저수지 1번과 대산플라워랜드 2번이에요. 출발지는 창원중앙역이며, 이 화면은 실제 길찾기 결과가 아니에요.", "This same September 9 itinerary shows Junam as 1 and Daesan as 2, starting at Changwon Jungang Station. This is a map view, not a verified route result.")}</p>
          <Capture name="map-two-desktop" width={949} height={850} alt="같은03:08시연의 실제 카카오 지도. 주남저수지1번·대산플라워랜드2번 사진표지와 창원중앙역 출발지가 모두 보입니다. 실제 경로 성공 증거는 아닙니다." />
        </>}
        {step === 3 && <>
          <p>{copy("출발 전에는 필요한 시설과 이동, 여행 날짜의 날씨를 다시 살펴보세요. 확인하지 못한 정보를 완료로 표시하지 않아요.", "Before leaving, recheck the facilities, every journey and the weather for your dates. Unconfirmed information stays unconfirmed.")}</p>
          <dl className="journey-review">
            <div><dt>{copy("이동", "Journeys")}</dt><dd>{copy("이 시연의 시간은 직선거리 추정 · 실제 경로 재확인 필요", "This recording uses straight-line estimates · recheck the actual routes")}</dd></div>
            <div><dt>{copy("편의", "Facilities")}</dt><dd>{copy("대산플라워랜드 승강기 미확인 · 방문 전 시설 문의", "Daesan lift information is unconfirmed · ask the venue before visiting")}</dd></div>
            <div><dt>{copy("날씨", "Weather")}</dt><dd>{copy("내 여행 날짜의 최신 예보 확인", "Check the latest forecast for your travel dates")}</dd></div>
          </dl>
        </>}
        <ol className="journey-scene-stops" data-recording="map-0308" data-date="2026-09-09" aria-label={copy("촬영된 9월 9일 일정 순서", "Recorded September 9 itinerary order")}>
          {stops.map((stop, index) => <li key={stop.id} data-place-id={stop.id} data-map-place-id={step === 2 ? stop.id : undefined}>
            <b aria-hidden="true">{index + 1}</b><span><strong>{copy(stop.name, stop.english)}</strong><small>{copy("9월 9일 · 창원", "September 9 · Changwon")}</small></span>
          </li>)}
        </ol>
      </div>
      <figcaption>{copy("2026년 9월 9일 실제 한국어 화면 · 여행 시작 링크에서 내 계획을 만들 수 있어요.", "Actual Korean screens recorded on 9 September 2026 · use the planning link to create your own trip.")}</figcaption>
    </figure>
  </section>;
}
