"use client";

/* eslint-disable @next/next/no-img-element -- 한국관광공사 API가 반환하는 가변 HTTPS CDN URL을 서버에서 검증한 뒤 지연 렌더링한다. */
import { useId, useRef, useSyncExternalStore } from "react";
import { MAX_PHOTOS, usePhotoCourse } from "./usePhotoCourse";

const REGIONS = ["창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산", "의령", "함안", "창녕", "고성", "남해", "하동", "산청", "함양", "거창", "합천"];
const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.png,.webp,.tif,.tiff";
const subscribeClientReady = () => () => {};

type Props = {
  onApply: (input: { region: string; travelStart: string; travelEnd: string }) => void;
};

export default function PhotoCourseRestore({ onApply }: Props) {
  const {
    course, names, enrichments, reading, progress, notice, applied, exportNotice,
    readFiles, renameStop, changeDayDate, moveStop, changeStopRegion,
    enrichStop, enrichAll, clear, apply, saveToDevice, share,
  } = usePhotoCourse(onApply);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const clientReady = useSyncExternalStore(subscribeClientReady, () => true, () => false);

  return (
    <section className="photo-course" aria-labelledby={headingId} data-client-ready={clientReady ? "true" : "false"}>
      <header className="photo-course-header">
        <p className="photo-course-kicker">사진으로 코스 복원</p>
        <h2 id={headingId}>다녀온 사진을 고르면 날짜별 코스를 다시 만듭니다</h2>
        <p className="photo-course-lead">
          촬영 시각과 GPS는 <strong>기기 안에서만</strong> 읽습니다. 사진 파일과 좌표는 서버로 전송되지 않습니다.
          장소를 직접 확인한 뒤에만 지역·장소명을 한국관광공사 API로 보내 공식 관광정보와 공공누리 사진을 찾습니다.
        </p>
      </header>

      <div className="photo-course-actions">
        <input
          ref={inputRef}
          id="photo-course-input"
          className="photo-course-input"
          type="file"
          accept={PHOTO_ACCEPT}
          multiple
          disabled={!clientReady}
          onChange={(event) => {
            void readFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <label className={`photo-course-pick${clientReady ? "" : " is-disabled"}`} aria-disabled={!clientReady} htmlFor="photo-course-input">
          {clientReady ? "사진 고르기" : "사진 기능 준비 중"}
        </label>
        {course && <button type="button" className="photo-course-clear" onClick={clear}>지우기</button>}
        <p className="photo-course-limit">JPG·JPEG·PNG·WebP·TIFF 최대 {MAX_PHOTOS}장 · 각 파일 앞 256KB만 판독</p>
      </div>

      <p className="photo-course-notice" role="status" aria-live="polite" aria-busy={reading}>
        {reading ? `사진 촬영 정보를 기기 안에서 읽고 있습니다… ${progress}%` : notice}
      </p>

      {course && course.days.length > 0 && <>
        <div className="photo-course-toolbar">
          <button type="button" onClick={() => void enrichAll()}>전체 장소 공식정보 확인</button>
          <p>확인은 한 장소씩 순차 호출해 공공 API 호출량을 제한합니다.</p>
        </div>

        <ol className="photo-course-days">
          {course.days.map((day, dayIndex) => (
            <li key={`${day.date}-${dayIndex}`} className="photo-course-day">
              <div className="photo-course-day-head">
                <label>
                  <span>여행 날짜</span>
                  <input type="date" value={day.date} onChange={(event) => changeDayDate(dayIndex, event.target.value)} />
                </label>
                <p>{day.region ? `${day.region} 중심 · ` : ""}방문지 {day.stops.length}곳</p>
              </div>

              <ol className="photo-course-stops">
                {day.stops.map((stop, stopIndex) => {
                  const enrichment = enrichments[stop.id];
                  const name = names[stop.id] ?? stop.suggestedName;
                  return (
                    <li key={stop.id} className="photo-course-stop">
                      <div className="photo-course-stop-main">
                        <div className="photo-course-stop-order">
                          <span className="photo-course-time">{stop.timeLabel}</span>
                          <button type="button" disabled={stopIndex === 0} onClick={() => moveStop(dayIndex, stopIndex, -1)} aria-label={`${name} 순서를 위로`}>↑</button>
                          <button type="button" disabled={stopIndex === day.stops.length - 1} onClick={() => moveStop(dayIndex, stopIndex, 1)} aria-label={`${name} 순서를 아래로`}>↓</button>
                        </div>

                        <label className="photo-course-name">
                          <span>방문지 이름</span>
                          <input type="text" value={name} maxLength={80} onChange={(event) => renameStop(stop.id, event.target.value)} />
                        </label>

                        <label className="photo-course-region">
                          <span>시·군</span>
                          <select value={stop.region} onChange={(event) => changeStopRegion(dayIndex, stop.id, event.target.value)}>
                            <option value="">직접 선택</option>
                            {REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                          </select>
                        </label>

                        <div className="photo-course-stop-meta">
                          <span>사진 {stop.photoCount}장</span>
                          {stop.hasPoint
                            ? <span className="photo-course-badge is-located">위치 확인</span>
                            : <span className="photo-course-badge is-unlocated">위치 없음</span>}
                          <button type="button" onClick={() => enrichStop(day, stop)} disabled={!stop.region || enrichment?.status === "loading"}>
                            {enrichment?.status === "loading" ? "공식정보 확인 중" : "공식정보 확인"}
                          </button>
                        </div>
                      </div>

                      {enrichment && enrichment.status !== "loading" && <div className={`photo-course-enrichment is-${enrichment.status}`} role="status">
                        {enrichment.status === "live" ? <>
                          {enrichment.image && <img src={enrichment.image} alt={`${enrichment.matchedTitle || name} 한국관광공사 관광사진`} loading="lazy" />}
                          <div>
                            <strong>{enrichment.matchedTitle || name}</strong>
                            {enrichment.address && <p>{enrichment.address}</p>}
                            <p>{enrichment.source || "한국관광공사 관광정보"}{enrichment.contentId ? ` · contentId ${enrichment.contentId}` : ""}</p>
                          </div>
                        </> : <p>
                          {enrichment.status === "empty"
                            ? "공식 데이터에서 동일 장소를 확인하지 못했습니다. 이름·지역을 확인하고 다시 시도해 주세요."
                            : "공식 관광정보 연결이 지연되고 있습니다. 코스 편집은 그대로 계속할 수 있습니다."}
                        </p>}
                      </div>}
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>

        <div className="photo-course-apply">
          <button type="button" onClick={apply}>여행 조건에 반영하기</button>
          <p>{course.regions.length > 0
            ? `${course.regions.join(", ")} 지역과 ${course.days[0].date} ~ ${course.days[course.days.length - 1].date} 날짜를 적용합니다.`
            : "GPS가 없던 사진은 시·군을 직접 고른 뒤 적용할 수 있습니다."}</p>
        </div>

        {applied && <p className="photo-course-applied" role="status">
          {applied.region ? `${applied.region} · ` : ""}{applied.travelStart} ~ {applied.travelEnd} · {applied.dayCount}일 {applied.stopCount}곳을 여행 조건에 반영했습니다.
        </p>}

        <div className="photo-course-export">
          <button type="button" onClick={saveToDevice}>좌표 없이 기기에 저장</button>
          <button type="button" onClick={() => void share()}>좌표 없이 코스 공유</button>
          <p>저장·공유 파일에는 날짜, 직접 확인한 장소명, 확인된 한국관광공사 contentId만 들어가며 원본 사진과 GPS는 포함되지 않습니다.</p>
        </div>
        {exportNotice && <p className="photo-course-applied" role="status" aria-live="polite">{exportNotice}</p>}
      </>}

      <details className="photo-course-limits">
        <summary>이 기능이 할 수 있는 일과 할 수 없는 일</summary>
        <ul>
          <li>촬영 시각과 좌표가 EXIF로 남아 있는 <strong>JPG·JPEG·PNG·WebP·TIFF 원본</strong>을 지원합니다. HEIC·HEIF는 이번 버전에서 지원하지 않습니다.</li>
          <li>PNG·WebP는 파일에 EXIF 블록이 보존된 경우에만 촬영 시각·GPS를 읽을 수 있습니다.</li>
          <li>사진 전체가 아니라 각 파일 앞 256KB만 한 장씩 읽어 대용량 원본의 메모리 사용을 제한합니다.</li>
          <li>시·군 경계나 경남 바깥 인접 지역은 다르게 추론될 수 있습니다. 화면에서 시·군과 장소명을 직접 고칠 수 있습니다.</li>
          <li>사진에 없는 장소 이름을 지어내지 않습니다. 공식정보 확인 전 표시되는 이름은 순서용 제안입니다.</li>
          <li>새로 고치면 분석 결과는 사라집니다. 별도 저장을 누르기 전에는 브라우저 저장소에도 기록하지 않습니다.</li>
        </ul>
      </details>
    </section>
  );
}
