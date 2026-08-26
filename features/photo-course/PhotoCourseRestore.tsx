"use client";

import { useId, useRef } from "react";
import { MAX_PHOTOS, usePhotoCourse } from "./usePhotoCourse";

type Props = {
  onApply: (input: { region: string; travelStart: string; travelEnd: string }) => void;
};

export default function PhotoCourseRestore({ onApply }: Props) {
  const { course, names, reading, notice, applied, readFiles, renameStop, clear, apply } = usePhotoCourse(onApply);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingId = useId();

  return (
    <section className="photo-course" aria-labelledby={headingId}>
      <header className="photo-course-header">
        <p className="photo-course-kicker">사진으로 코스 복원</p>
        <h2 id={headingId}>다녀온 사진을 고르면 날짜별 코스를 만들어 드립니다</h2>
        <p className="photo-course-lead">
          사진은 <strong>기기 안에서만</strong> 분석합니다. 사진 파일과 촬영 위치는 서버로 전송되지 않고,
          W.A.V.E가 넘겨받는 것은 확인하신 장소 이름과 날짜뿐입니다.
        </p>
      </header>

      <div className="photo-course-actions">
        <input
          ref={inputRef}
          id="photo-course-input"
          className="photo-course-input"
          type="file"
          accept="image/jpeg"
          multiple
          onChange={(event) => {
            void readFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <label className="photo-course-pick" htmlFor="photo-course-input">
          사진 고르기
        </label>
        {course && <button type="button" className="photo-course-clear" onClick={clear}>
          지우기
        </button>}
        <p className="photo-course-limit">JPEG 원본 최대 {MAX_PHOTOS}장</p>
      </div>

      <p className="photo-course-notice" role="status" aria-live="polite" aria-busy={reading}>
        {reading ? "사진의 촬영 정보를 기기 안에서 읽고 있습니다…" : notice}
      </p>

      {course && course.days.length > 0 && <>
        <ol className="photo-course-days">
          {course.days.map((day) => (
            <li key={day.date} className="photo-course-day">
              <div className="photo-course-day-head">
                <h3>{day.date}</h3>
                <p>{day.region ? `${day.region} 중심 · ` : ""}방문지 {day.stops.length}곳</p>
              </div>
              <ol className="photo-course-stops">
                {day.stops.map((stop) => (
                  <li key={stop.id} className="photo-course-stop">
                    <span className="photo-course-time">{stop.timeLabel}</span>
                    <label className="photo-course-name">
                      <span className="sr-only">{day.date} {stop.timeLabel} 방문지 이름</span>
                      <input
                        type="text"
                        value={names[stop.id] ?? stop.suggestedName}
                        maxLength={80}
                        onChange={(event) => renameStop(stop.id, event.target.value)}
                      />
                    </label>
                    <span className="photo-course-meta">
                      사진 {stop.photoCount}장
                      {stop.hasPoint
                        ? <> · <span className="photo-course-badge is-located">위치 확인</span></>
                        : <> · <span className="photo-course-badge is-unlocated">위치 없음</span></>}
                    </span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>

        <div className="photo-course-apply">
          <button type="button" onClick={apply}>여행 조건에 반영하기</button>
          <p>
            {course.regions.length > 0
              ? `${course.regions.join(", ")} 지역과 ${course.days[0].date} ~ ${course.days[course.days.length - 1].date} 날짜를 적용합니다.`
              : "경남 안에서 찍은 사진이 없어 지역은 그대로 두고 날짜만 적용합니다."}
          </p>
        </div>

        {applied && <p className="photo-course-applied" role="status">
          {applied.region ? `${applied.region} · ` : ""}
          {applied.travelStart} ~ {applied.travelEnd} · {applied.dayCount}일 {applied.stopCount}곳을 반영했습니다.
          아래 조건에서 이어서 여행을 설계해 보세요.
        </p>}
      </>}

      <details className="photo-course-limits">
        <summary>이 기능이 할 수 있는 일과 할 수 없는 일</summary>
        <ul>
          <li>촬영 시각과 좌표가 남아 있는 <strong>JPEG 원본</strong>에서만 동작합니다. 메신저로 주고받은 사진은 대부분 이 정보가 지워져 있습니다.</li>
          <li>좌표로 가장 가까운 시·군을 고릅니다. 시·군 경계나 경남 바깥 인접 지역에서는 다르게 나올 수 있어 직접 고치실 수 있습니다.</li>
          <li>장소 이름은 사진만으로 알 수 없습니다. 제안된 이름은 순서 표시일 뿐이며 직접 입력하시는 것을 전제로 합니다.</li>
          <li>새로 고치면 분석 결과는 사라집니다. 사진도 결과도 저장하지 않습니다.</li>
        </ul>
      </details>
    </section>
  );
}
