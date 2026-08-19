import type { useTripSelection } from "../hooks/useTripSelection";

export default function TripDayPlanner({ tripSelection }: { tripSelection: ReturnType<typeof useTripSelection> }) {
  const { scheduleAssignments, tripDays, orderedSavedPlaces, orderExplanation, assignPlaceToDay } = tripSelection;
  if (!orderedSavedPlaces.length) return null;
  return <section className="day-planner" data-reveal aria-label="날짜별 여행 일정">
    <header><div><span>나의 여행 일정</span><h3>이동 부담을 줄이는 순서로 정리했어요.</h3></div><p>{orderExplanation} 장소 선택은 공유하기 전까지 이 기기에만 저장됩니다.</p></header>
    <div className="day-planner-grid">{tripDays.map((day, dayIndex) => <article key={day}>
      <div><small>DAY {String(dayIndex + 1).padStart(2, "0")}</small><strong>{new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${day}T12:00:00`))}</strong></div>
      <ol>{orderedSavedPlaces.filter((place) => (scheduleAssignments[place.id] || tripDays[0]) === day).map((place, index) => <li key={place.id}><span>{index + 1}</span><div><b>{place.name}</b><small>{place.address || place.city}</small></div><select aria-label={`${place.name} 여행 날짜`} value={scheduleAssignments[place.id] || tripDays[0]} onChange={(event) => assignPlaceToDay(place.id, event.target.value)}>{tripDays.map((date, dateIndex) => <option key={date} value={date}>DAY {dateIndex + 1}</option>)}</select></li>)}</ol>
      {!orderedSavedPlaces.some((place) => (scheduleAssignments[place.id] || tripDays[0]) === day) && <p>보관한 장소의 날짜를 이 날로 바꿔 추가하세요.</p>}
    </article>)}</div>
  </section>;
}
