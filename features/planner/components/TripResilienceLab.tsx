"use client";
import { useMemo, useState } from "react";
import { FACILITIES } from "../../../lib/facility-selection.js";
import { companionCommonGround, type CompanionInput } from "../../../lib/companion-common-ground.js";
import { runTripStressTest, type StressScenario } from "../../../lib/trip-stress-test.js";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { useItineraryRoutes } from "../hooks/useItineraryRoutes";
import type { Place, WeatherData } from "../types";
import styles from "./TravelExperience.module.css";

const scenarioLabels: Record<StressScenario, string> = { rain: "비", closure: "한 곳 휴무", fatigue: "평소보다 피로", "route-loss": "경로 조회 실패" };
const stateLabels = { common: "모두 확인", unknown: "확인 필요", blocked: "조건과 맞지 않음" };

export default function TripResilienceLab({ trip, coverage, requiredKeys, weather, onProfiles, onAlternative, onSelectPlace }: {
  trip: ReturnType<typeof useTripSelection>; coverage: ReturnType<typeof useItineraryRoutes>; requiredKeys: string[]; weather: WeatherData | null;
  onProfiles: (keys: string[]) => void; onAlternative: (id: string) => void; onSelectPlace: (place: Place) => void;
}) {
  const [members, setMembers] = useState<CompanionInput[]>([
    { id: "me", name: "나", facilities: requiredKeys, maxWalkMinutes: trip.comfort.maxWalkMinutes },
    { id: "companion-1", name: "동행자 1", facilities: [], maxWalkMinutes: null },
  ]);
  const [scenarios, setScenarios] = useState<StressScenario[]>(weather?.days?.some(day => day.rainProbability >= 60) ? ["rain"] : []);
  const [closurePlaceId, setClosurePlaceId] = useState(trip.orderedSavedPlaces[0]?.id || "");
  const common = useMemo(() => companionCommonGround(members, trip.orderedSavedPlaces), [members, trip.orderedSavedPlaces]);
  const routeReadyByPlaceId = useMemo(() => Object.fromEntries(coverage.legs.map(leg => [leg.place.id, Boolean(coverage.data[leg.key])])), [coverage.legs, coverage.data]);
  const stress = useMemo(() => runTripStressTest({ places: trip.orderedSavedPlaces, scenarios, requiredKeys: common.requirements.map(item => item.key), walkingByPlaceId: coverage.walkingByPlaceId, routeReadyByPlaceId, closurePlaceId, maxWalkMinutes: common.strictestWalkMinutes }), [trip.orderedSavedPlaces, scenarios, common, coverage.walkingByPlaceId, routeReadyByPlaceId, closurePlaceId]);
  const setMember = (index: number, value: Partial<CompanionInput>) => setMembers(current => current.map((member, i) => i === index ? { ...member, ...value } : member));
  const applyCommon = () => {
    onProfiles(common.requirements.map(item => item.key));
    if (common.strictestWalkMinutes) trip.setComfort({ ...trip.comfort, maxWalkMinutes: common.strictestWalkMinutes });
  };
  return <div className={styles.experience}>
    <h3>여행 점검</h3><p>동행 조건이 함께 지켜지는지 보고, 예상 밖 상황을 미리 가정해 봅니다. 결과는 확인된 자료와 가정을 구분해 표시해요.</p>
    <details><summary>동행자 공통 조건</summary>
      <div className={styles.fields}>{members.map((member, index) => <fieldset className={styles.card} key={member.id}><legend>{member.name || `동행자 ${index + 1}`}</legend>
        <label>구분 이름<input value={member.name || ""} maxLength={20} onChange={event => setMember(index, { name: event.target.value })}/></label>
        <label>연속 걷기 기준<select value={member.maxWalkMinutes || ""} onChange={event => setMember(index, { maxWalkMinutes: event.target.value ? Number(event.target.value) : null })}><option value="">정하지 않음</option>{[5,10,15,20,30,45,60].map(value => <option key={value} value={value}>{value}분</option>)}</select></label>
        <details><summary>필요한 시설 {member.facilities?.length || 0}개</summary><div className={styles.fields}>{FACILITIES.map(facility => <label key={facility.key}><span><input type="checkbox" checked={member.facilities?.includes(facility.key) || false} onChange={event => setMember(index, { facilities: event.target.checked ? [...(member.facilities || []), facility.key] : (member.facilities || []).filter(key => key !== facility.key) })}/>{facility.label}</span></label>)}</div></details>
        {members.length > 1 && <button type="button" onClick={() => setMembers(current => current.filter((_, i) => i !== index))}>이 동행자 삭제</button>}
      </fieldset>)}</div>
      <div className={styles.actions}><button type="button" disabled={members.length >= 8} onClick={() => setMembers(current => [...current, { id: `companion-${Date.now()}`, name: `동행자 ${current.length}`, facilities: [], maxWalkMinutes: null }])}>동행자 추가</button><button type="button" disabled={!common.hasNeeds} onClick={applyCommon}>공통 조건을 여행에 적용</button></div>
      {common.requirements.length > 0 && <p>함께 지킬 조건: {common.requirements.map(item => `${item.label}(${item.members.join("·")})`).join(" · ")}{common.strictestWalkMinutes ? ` · 연속 걷기 ${common.strictestWalkMinutes}분` : ""}</p>}
      <ul>{common.evaluations.map(item => <li className={styles.card} key={item.placeId}><button type="button" onClick={() => { const place = trip.orderedSavedPlaces.find(place => place.id === item.placeId); if (place) onSelectPlace(place); }}>{item.name}</button><strong>{stateLabels[item.state]}</strong>{item.members.filter(member => member.state !== "common").map(member => <small key={member.id}>{member.name}: {member.negative.length ? "조건과 맞지 않는 시설 있음" : "시설 정보 미확인"}</small>)}</li>)}</ul>
    </details>
    <details><summary>일정 스트레스 테스트</summary><p>실제 예보나 휴무 판정이 아니라 선택한 상황을 가정해 일정의 약한 부분을 찾습니다.</p>
      <div className={styles.actions}>{(Object.keys(scenarioLabels) as StressScenario[]).map(id => <button type="button" key={id} aria-pressed={scenarios.includes(id)} onClick={() => setScenarios(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])}>{scenarioLabels[id]}</button>)}</div>
      {scenarios.includes("closure") && <label>휴무로 가정할 곳<select value={closurePlaceId} onChange={event => setClosurePlaceId(event.target.value)}>{trip.orderedSavedPlaces.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>}
      {!scenarios.length ? <p>확인할 상황을 하나 이상 선택해 주세요.</p> : <ul>{stress.findings.map(item => <li className={styles.card} key={item.scenario}><strong>{item.title}</strong><p>{item.reason}</p><small>{item.affectedIds.length ? `영향 가능 ${item.affectedIds.length}곳` : "현재 자료에서 특정 영향 장소 없음"}</small>{item.scenario === "closure" && item.affectedIds[0] && <button type="button" onClick={() => onAlternative(item.affectedIds[0])}>대안 비교</button>}{item.scenario === "fatigue" && <button type="button" onClick={() => trip.setComfort({ ...trip.comfort, breakEveryMinutes: trip.comfort.breakEveryMinutes ?? 60, breakMinutes: Math.max(15, trip.comfort.breakMinutes) })}>휴식 기준 적용</button>}{item.scenario === "route-loss" && <button type="button" disabled={coverage.loading} onClick={() => void coverage.checkRoutes()}>경로 다시 확인</button>}</li>)}</ul>}
      {stress.facilityUnknown > 0 && <p>{stress.facilityUnknown}곳은 동행 공통 시설이 모두 확인되지 않았어요. 장소 이름을 눌러 공식 정보와 문의 방법을 확인하세요.</p>}
    </details>
  </div>;
}
