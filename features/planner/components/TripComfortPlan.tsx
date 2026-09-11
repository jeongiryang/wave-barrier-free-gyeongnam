"use client";
import { useState } from "react";
import { assessWalking, suggestTripBreaks } from "../../../lib/trip-comfort.js";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { useItineraryRoutes } from "../hooks/useItineraryRoutes";
import { buildItinerarySchedule } from "../optimization/itinerary-schedule.js";

export default function TripComfortPlan({ trip, coverage, schedule, en = false }: {
  trip: ReturnType<typeof useTripSelection>; coverage: ReturnType<typeof useItineraryRoutes>; schedule: ReturnType<typeof buildItinerarySchedule>; en?: boolean;
}) {
  const [notice, setNotice] = useState("");
  const active = schedule.filter(day => day.day === trip.activeDay), entries = active[0]?.entries || [];
  const walking = assessWalking(entries.map(entry => ({ id: entry.place.id, evidence: coverage.walkingByPlaceId[entry.place.id] || null })), trip.comfort.maxWalkMinutes);
  const proposal = suggestTripBreaks(active, trip.comfort, trip.breakMinutesByPlaceId), proposedCount = Object.keys(proposal).length;
  const plannedRest = entries.reduce((sum, entry) => sum + (trip.breakMinutesByPlaceId[entry.place.id] || 0), 0);
  const say = (ko: string, english: string) => en ? english : ko;
  return <details className="place-evidence trip-comfort-plan" style={{ marginBlock: 12 }}>
    <summary>{say("걷기·휴식 확인", "Walking and rests")}{plannedRest ? ` · ${say(`휴식 ${plannedRest}분`, `${plannedRest} min rest`)}` : ""}</summary>
    <div className="modal-data">
      <h3>{say("오늘의 이동 구간", "Today's travel legs")}</h3>
      <p>{walking.checked ? say(`확인한 ${walking.checked}구간의 걷기 ${walking.minutes}분`, `Walking in ${walking.checked} checked legs: ${walking.minutes} min`) : say("아직 걷기 구간을 확인하지 않았어요.", "Walking legs have not been checked.")}{walking.metres > 0 ? ` · ${(walking.metres / 1000).toFixed(1)}km` : ""}</p>
      {walking.unknown > 0 && <p>{say(`${walking.unknown}구간은 걷기시간 미확인입니다.`, `Walking time is unknown for ${walking.unknown} legs.`)}</p>}
      {walking.unknownMetres > 0 && walking.metres > 0 && <p>{say("거리는 제공된 구간만 합산했어요.", "The distance total includes only reported legs.")}</p>}
      <p>{trip.comfort.maxWalkMinutes ? say(`나의 연속 걷기 기준은 ${trip.comfort.maxWalkMinutes}분입니다.`, `Your continuous walking limit is ${trip.comfort.maxWalkMinutes} minutes.`) : say("걷기 기준은 필요한 편의 단계에서 정할 수 있어요.", "Set a walking limit in the facilities step.")}</p>
      {walking.overLimit.map(item => <p role="status" key={item.id}><b>{entries.find(entry => entry.place.id === item.id)?.place.name}</b> · {say(`연속 걷기 ${item.minutes}분, 고른 기준보다 길어요. 가까운 장소나 다른 이동수단을 검토해 주세요.`, `${item.minutes} min of continuous walking exceeds your choice. Consider a closer place or another travel mode.`)}</p>)}
      <p className="modal-note">{say("길찾기에 포함된 걷기만 비교해요. 장소 안의 이동·계단·경사와 실제 이용 가능성은 별도로 확인해 주세요. 휴식을 넣어도 긴 구간의 걷기 기준 초과는 그대로 표시합니다.", "Only walking reported by directions is compared. Check movement inside venues, steps, slopes and access separately. Adding a rest does not remove an over-limit walking leg.")}</p>
      <div className="travel-book-actions"><button type="button" disabled={coverage.loading || !coverage.legs.length} onClick={() => void coverage.checkRoutes()}>{coverage.loading ? say("이동 구간 확인 중…", "Checking travel legs…") : say("이동 구간 확인", "Check travel legs")}</button>{coverage.loading && <button type="button" onClick={coverage.cancel}>{say("확인 중단", "Stop checking")}</button>}</div>
      <h3>{say("일정 사이에 쉬어가기", "Rests between visits")}</h3>
      <div className="auth-field"><label>{say("일정의 휴식 간격", "Itinerary rest interval")}<select value={trip.comfort.breakEveryMinutes ?? ""} onChange={event => trip.setComfort({ ...trip.comfort, breakEveryMinutes: event.target.value ? Number(event.target.value) : null })}><option value="">{say("필요할 때 직접 추가", "Add as needed")}</option>{[...new Set([30, 60, 90, 120, 180, 240, 360, ...(trip.comfort.breakEveryMinutes ? [trip.comfort.breakEveryMinutes] : [])])].sort((a, b) => a - b).map(value => <option value={value} key={value}>{say(`약 ${value}분마다`, `About every ${value} min`)}</option>)}</select></label></div>
      <div className="auth-field"><label>{say("일정의 휴식 시간", "Length of planned rests")}<select value={trip.comfort.breakMinutes} onChange={event => trip.setComfort({ ...trip.comfort, breakMinutes: Number(event.target.value) })}>{[...new Set([5, 10, 15, 20, 30, 60, 120, trip.comfort.breakMinutes])].sort((a, b) => a - b).map(value => <option value={value} key={value}>{value}{say("분", " min")}</option>)}</select></label></div>
      <p>{say(`현재 이 날에 더한 휴식 ${plannedRest}분.`, `${plannedRest} minutes of added rests on this day.`)} {proposedCount ? say(`${proposedCount}곳의 방문 뒤에 ${trip.comfort.breakMinutes}분씩 쉴 수 있도록 제안해요.`, `Proposing ${trip.comfort.breakMinutes} minutes after ${proposedCount} visits.`) : say("방문 뒤 휴식은 장소의 더보기에서 직접 정할 수도 있어요.", "You can also set a rest after a visit in its edit menu.")}</p>
      {proposedCount > 0 && <div className="travel-book-actions"><button type="button" onClick={() => { trip.addSuggestedBreaks(proposal); setNotice(say(`${proposedCount}곳 뒤에 휴식을 더했어요. 바뀐 도착 시각과 귀가 시간을 확인해 주세요.`, "Rests added. Check updated arrival and return times.")); }}>{say(`제안한 휴식 ${proposedCount}개 추가`, `Add ${proposedCount} proposed rests`)}</button></div>}
      <p className="modal-note">{say("이동·방문·대기 시간을 합쳐 간격을 계산합니다. 쉬는 장소의 좌석이나 운영은 확인되지 않았으므로 이용 정보에서 살펴보고, 필요하면 아래에서 쉬어 갈 곳을 추가하세요.", "Intervals include travel, visits and waiting. Seating and opening are not verified; check the venue or add a rest stop below.")}</p>
      <p role="status">{notice}</p>
    </div>
  </details>;
}
