'use client';

import { useEffect, useRef } from 'react';
import { buildItinerarySchedule } from '../optimization/itinerary-schedule.js';
import { assessDayDeadline, type DayDeadline, type FixedVisit } from '../../../lib/trip-time-constraints.js';
import { suggestTripBreaks, type TripComfort } from '../../../lib/trip-comfort.js';
import type { Place } from '../types';
import type { RoutePoint } from '../../routing/types';
import NaruScheduleReview from './NaruScheduleReview';

type Props = {
  places: Place[]; days: string[]; assignments: Record<string, string>; startTime: string;
  origin: RoutePoint; routeMinutes: Record<string, number>; visits: Record<string, number>;
  breaks: Record<string, number>; fixed: Record<string, FixedVisit>; deadlines: Record<string, DayDeadline>;
  comfort: TripComfort; onTool: (id: string) => void; onDetails: (place: Place) => void;
  onAlternative: (id: string) => void; onRequest: (text: string) => void;
};

/** Read the same timetable as the planner. Checking never mutates the trip. */
export default function NaruTripReview(props: Props) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { panel.current?.focus(); }, []);
  if (!props.places.length || !props.days.length) return <section ref={panel} tabIndex={-1} className="naru-schedule-review" aria-label="나루 여행 점검">
    <h3>여행을 이어서 완성해요</h3>
    <p>{props.places.length ? `담은 ${props.places.length}곳은 그대로예요. 날짜와 출발지를 정하면 시간표를 점검할 수 있어요.` : '가고 싶은 장소부터 담아주세요. 날짜는 나중에 정해도 괜찮아요.'}</p>
    <button type="button" onClick={() => props.onTool(props.places.length ? 'dates' : 'places')}>{props.places.length ? '날짜·출발지 정하기' : '여행지 찾기'}</button>
  </section>;
  const days = buildItinerarySchedule({ places: props.places, days: props.days, assignments: props.assignments,
    startTime: props.startTime, origin: props.origin, routeMinutesByPlaceId: props.routeMinutes,
    visitMinutesByPlaceId: props.visits, breakMinutesByPlaceId: props.breaks, fixedVisits: props.fixed });
  const suggested = suggestTripBreaks(days, props.comfort, props.breaks);
  const visits = days.flatMap(day => day.entries.map(entry => ({ place: entry.place, day: day.day,
    startsAt: entry.startsAt, endsAt: entry.visitEndsAt, travelSource: entry.travelSource })));
  return <section ref={panel} tabIndex={-1} className="naru-schedule-review" aria-label="나루 여행 점검">
    <h3>내 여행, 어디를 다듬으면 좋을까요?</h3>
    <p>현재 시간표를 바탕으로 확인했어요. 점검으로 일정이 바뀌지는 않아요.</p>
    <p>{props.comfort.maxWalkMinutes ? `연속 걷기 ${props.comfort.maxWalkMinutes}분 기준 · ` : '걷기 기준 미설정 · '}{props.comfort.breakEveryMinutes ? `${props.comfort.breakEveryMinutes}분마다 ${props.comfort.breakMinutes}분 휴식 기준` : '휴식 간격 미설정'}</p>
    <small>이동시간은 걷기시간과 다릅니다. 실제 보행 구간과 쉬어 갈 시설은 따로 확인해 주세요.</small>
    {days.map(day => {
      const late = day.entries.filter(entry => entry.lateMinutes > 0);
      const estimate = day.entries.filter(entry => entry.travelSource !== 'route').length;
      const deadline = assessDayDeadline(day.entries, props.deadlines[day.day]);
      const rests = day.entries.filter(entry => suggested[entry.place.id]);
      return <article key={day.day}>
        <h4>{day.day} · {day.entries.length}곳</h4>
        {!day.entries.length ? <p>아직 방문 장소가 없는 날이에요.</p> : <>
          <p>{day.entries[0].startsAtLabel} 첫 방문 → {day.entries.at(-1)!.endsAtLabel} 마지막 휴식까지 · 체류 {day.entries.reduce((sum, entry) => sum + entry.visitMinutes, 0)}분 · 휴식 {day.entries.reduce((sum, entry) => sum + entry.breakMinutes, 0)}분</p>
          <ul>
            {late.map(entry => <li key={entry.place.id}>{entry.place.name}: 고정 시각 {entry.fixedTime}보다 예상 도착이 {entry.lateMinutes}분 늦어요.</li>)}
            {day.entries.some(entry => entry.crossesDateBoundary) && <li>일정이 다음 날까지 이어져요. 방문 수와 시간을 조정해 주세요.</li>}
            {deadline?.state === 'over' && <li>마치는 시각 {props.deadlines[day.day].time}보다 {Math.abs(deadline.remainingMinutes)}분 초과 예상이에요.{!deadline.returnKnown && ' 귀가 이동시간도 아직 빠져 있어요.'}</li>}
            {deadline?.state === 'unknown' && <li>귀가 이동시간이 미정이라 마치는 시각을 지킬 수 있는지 아직 알 수 없어요.</li>}
            {deadline?.state === 'within' && <li>입력한 귀가·여유시간 포함 {deadline.remainingMinutes}분 여유 예상. 당일 교통 상황은 별도 확인해 주세요.</li>}
            {!deadline && <li>이 날의 마치는 시각과 귀가시간을 아직 정하지 않았어요.</li>}
            {estimate > 0 && <li>{estimate}개 이동 구간은 추정값이에요. 실제 교통편을 확인하면 시간표가 달라질 수 있어요.</li>}
            {rests.length > 0 && <li>설정한 휴식 간격에 따라 {rests.map(entry => entry.place.name).join(', ')} 방문 뒤 휴식을 검토해 주세요.</li>}
          </ul>
        </>}
      </article>;
    })}
    <div>
      <button type="button" onClick={() => props.onTool('itinerary')}>날짜·방문시간 수정</button>
      <button type="button" onClick={() => props.onTool('comfort')}>걷기·휴식·귀가 설정</button>
      <button type="button" onClick={() => props.onTool('transport')}>실제 이동 확인</button>
      <button type="button" onClick={() => props.onRequest('기존 날짜와 고정 방문을 유지하고 현재 일정에서 이동 부담을 줄여줘')}>나루에게 여유로운 변경안 요청</button>
    </div>
    <NaruScheduleReview visits={visits} onDetails={props.onDetails} onAlternative={props.onAlternative} />
  </section>;
}
