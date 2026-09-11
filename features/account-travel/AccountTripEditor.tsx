"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import AccountTravelGate from "./AccountTravelGate";
import TripCompanions from "./TripCompanions";
import { AccountTravelError, travelRequest } from "./client";
import type { AccountTrip, AccountTripPayload, TripDetail } from "./types";
import type { Place } from "../planner/types";
import { dateRange } from "../planner/utils";
import { boundedTripEnd, validTripDate } from "../../lib/trip-dates.js";
import { KakaoSendToSelf, KakaoTravelShare } from "../kakao-travel/KakaoTravelActions";
import VisitDurationControl from "../planner/components/VisitDurationControl";
import { visitDurationFor, buildItinerarySchedule } from "../planner/optimization/itinerary-schedule.js";
import FixedVisitControl, { FixedVisitSummary } from "../planner/components/FixedVisitControl";
import DayDeadlineControl, { DayDeadlineSummary } from "../planner/components/DayDeadlineControl";
import { sanitizeFixedVisits, sanitizeDayDeadlines } from "../../lib/trip-time-constraints.js";
import { changeVisitDuration } from "../../lib/visit-durations.js";
import KakaoTaxiLink from "../kakao-travel/KakaoTaxiLink";

function Editor({ id, userId }: { id: string; userId: string }) {
  const router = useRouter();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [draft, setDraft] = useState<AccountTripPayload | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeNotice, setPlaceNotice] = useState("장소 이름과 최신 이용 정보를 확인해 주세요.");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const lock = useRef(false);
  const draftRevision = useRef(0);
  const copyId = useRef("");
  const refresh = useCallback(async () => {
    const data = await travelRequest<TripDetail>(`/${id}`); setTrip(data);
  }, [id]);
  useEffect(() => {
    const controller = new AbortController();
    travelRequest<TripDetail>(`/${id}`, undefined, controller.signal).then(data => {
      setTrip(data); setDraft(data.payload); draftRevision.current = data.revision;
      return travelRequest<{ places: Place[]; missing: number }>(`/${id}/places`, {}, controller.signal).then(result => {
        if (!Array.isArray(result.places)) throw new Error("장소 응답을 확인하지 못했습니다.");
        if (!controller.signal.aborted) { setPlaces(result.places); setPlaceNotice(result.missing ? `${result.missing}곳의 최신 정보를 확인하지 못했습니다. 저장한 장소와 순서는 유지됩니다.` : "공식 관광정보로 장소를 확인했어요."); }
      }).catch(() => { if (!controller.signal.aborted) setPlaceNotice("장소 정보를 불러오지 못했습니다. 저장한 일정은 유지되며 아래에서 다시 확인할 수 있어요."); });
    }).catch(error => { if (!controller.signal.aborted) setNotice(error.message); });
    return () => controller.abort();
  }, [id]);
  const run = useCallback((action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNotice("");
    void action().catch(error => {
      setNotice(error instanceof Error ? error.message : "요청을 완료하지 못했습니다.");
      if (error instanceof AccountTravelError && error.status === 409) setConflict(true);
      if (error instanceof AccountTravelError && [401, 403, 404].includes(error.status)) { setTrip(null); setDraft(null); setPlaces([]); }
    }).finally(() => { lock.current = false; setBusy(false); });
  }, []);
  async function loadPlaces() {
    const result = await travelRequest<{ places: Place[]; missing: number }>(`/${id}/places`, {});
    if (!Array.isArray(result.places)) throw new Error("장소 응답을 확인하지 못했습니다.");
    setPlaces(result.places); setPlaceNotice(result.missing ? `${result.missing}곳의 최신 정보를 확인하지 못했습니다. 저장한 장소와 순서는 유지됩니다.` : "공식 관광정보로 장소를 확인했어요.");
  }
  function change(patch: Partial<AccountTripPayload>) { setDraft(current => current ? { ...current, ...patch } : current); }
  const owner = trip?.role === "owner";
  const tripDays = draft && validTripDate(draft.travelStart) && validTripDate(draft.travelEnd) ? dateRange(draft.travelStart, boundedTripEnd(draft.travelStart, draft.travelEnd)) : [];
  const timedDays = draft ? buildItinerarySchedule({ places: draft.placeIds.map(id => places.find(place => place.id === id) || { id }), days: tripDays, assignments: draft.scheduleAssignments, startTime: draft.dayStartTime, visitMinutesByPlaceId: draft.visitMinutesByPlaceId, fixedVisits: draft.fixedVisits }) : [];
  const changed = Boolean(draft && trip && JSON.stringify(draft) !== JSON.stringify(trip.payload));
  useEffect(() => { if (!changed) return; const handler = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [changed]);
  return <>
    <div className="travel-book-actions"><Link href="/my-trips">← 계정 여행 목록</Link><Link href="/guide#companions">사용 방법</Link></div><p role="status">{busy ? "여행을 반영하고 있어요…" : notice}</p>
    {!trip || !draft ? <section className="travel-book-empty"><h2>{notice || "내 여행을 불러오고 있어요."}</h2><button type="button" onClick={() => window.location.reload()}>다시 불러오기</button></section> : <>
      <section className="account-settings" aria-labelledby="trip-edit-title"><h2 id="trip-edit-title">{trip.payload.title}</h2><p>{owner ? "내가 만든 여행 · 일정 편집과 동행자 초대" : "함께하는 여행 · 장소 투표와 의견 나누기"}</p>
        {owner && <><div className="auth-field"><label htmlFor="trip-title">여행 이름</label><input id="trip-title" value={draft.title} onChange={event => change({ title: event.target.value })} maxLength={80} /></div>
          <div className="account-trip-dates"><div className="auth-field"><label htmlFor="trip-start">시작 날짜</label><input id="trip-start" type="date" value={draft.travelStart} onChange={event => change({ travelStart: event.target.value })} /></div><div className="auth-field"><label htmlFor="trip-end">마지막 날짜</label><input id="trip-end" type="date" value={draft.travelEnd} onChange={event => change({ travelEnd: event.target.value })} /></div><div className="auth-field"><label htmlFor="trip-time">하루 시작 시간</label><input id="trip-time" type="time" value={draft.dayStartTime} onChange={event => change({ dayStartTime: event.target.value })} /></div></div>
          <div className="travel-book-status"><button type="button" aria-pressed={draft.status === "planned"} onClick={() => change({ status: "planned" })}>갈 여행</button><button type="button" aria-pressed={draft.status === "visited"} onClick={() => change({ status: "visited" })}>다녀온 여행</button></div></>}
        <p>{trip.payload.travelStart} — {trip.payload.travelEnd} · {trip.payload.placeIds.length}곳</p>
        <div className="travel-book-actions"><button type="button" disabled={busy} onClick={() => run(loadPlaces)}>장소 이름·최신 정보 확인</button></div><p role="status">{placeNotice}</p>
        <details className="place-evidence"><summary>날짜별 귀가·약속 시간</summary>{timedDays.map(({day, entries}) => <div key={day}><h3>{day}</h3>{owner ? <DayDeadlineControl day={day} value={draft.dayDeadlines?.[day]} entries={entries} onChange={value => { const next = { ...draft.dayDeadlines }; if (value) next[day] = value; else delete next[day]; change({ dayDeadlines: sanitizeDayDeadlines(next, tripDays) }); }} /> : <DayDeadlineSummary entries={entries} value={draft.dayDeadlines?.[day]} />}</div>)}</details>
        <div className="travel-book-days">{draft.placeIds.map((placeId, index) => {
          const place = places.find(item => item.id === placeId);
          const voted = trip.votes.some(vote => vote.userId === userId && vote.placeId === placeId);
          const days = validTripDate(draft.travelStart) && validTripDate(draft.travelEnd) ? dateRange(draft.travelStart, boundedTripEnd(draft.travelStart, draft.travelEnd)) : [];
          return <section key={placeId}><header><strong>{index + 1}. {place?.name || `저장한 여행지 ${index + 1}`}</strong><small>{trip.votes.filter(vote => vote.placeId === placeId).length}명 선택</small></header>
            {place ? <p>{place.address || place.city} · {place.source}</p> : <p>장소 번호 {placeId} · 위에서 공식 정보를 확인할 수 있어요.</p>}
            {owner ? <div className="auth-field"><label htmlFor={`day-${placeId}`}>방문 날짜</label><select disabled={Boolean(draft.fixedVisits?.[placeId])} id={`day-${placeId}`} value={draft.scheduleAssignments[placeId]} onChange={event => change({ scheduleAssignments: { ...draft.scheduleAssignments, [placeId]: event.target.value } })}>{!days.includes(draft.scheduleAssignments[placeId]) && <option value={draft.scheduleAssignments[placeId]}>기간 밖 · {draft.scheduleAssignments[placeId]}</option>}{days.map(day => <option key={day} value={day}>{day}</option>)}</select></div> : <p>{draft.scheduleAssignments[placeId]} 방문</p>}
            {owner ? <VisitDurationControl name={place?.name || `여행지 ${index + 1}`} value={draft.visitMinutesByPlaceId?.[placeId]} defaultMinutes={visitDurationFor(place)} onChange={value => change({ visitMinutesByPlaceId: changeVisitDuration(draft.visitMinutesByPlaceId || {}, placeId, value) })} /> : draft.visitMinutesByPlaceId?.[placeId] && <p>체류 {draft.visitMinutesByPlaceId[placeId]}분</p>}
            {owner && <FixedVisitControl name={place?.name || `여행지 ${index + 1}`} value={draft.fixedVisits?.[placeId]} position={draft.placeIds.filter(id => draft.scheduleAssignments[id] === draft.scheduleAssignments[placeId]).indexOf(placeId)} onChange={value => { const next = { ...draft.fixedVisits }; if (value) next[placeId] = value; else delete next[placeId]; change({ fixedVisits: sanitizeFixedVisits(next, draft.placeIds) }); }} />}<FixedVisitSummary fixed={draft.fixedVisits?.[placeId]} waiting={timedDays.flatMap(day => day.entries).find(entry => entry.place.id === placeId)?.waitingMinutes} late={timedDays.flatMap(day => day.entries).find(entry => entry.place.id === placeId)?.lateMinutes} />
            <div className="travel-book-actions"><button type="button" disabled={busy || !trip.payload.placeIds.includes(placeId)} aria-pressed={voted} onClick={() => run(async () => { await travelRequest(`/${id}/participate`, { action: "vote", placeId, selected: !voted }); await refresh(); })}>{voted ? "가고 싶어요 취소" : "가고 싶어요"}</button>
              {owner && <><button type="button" disabled={index === 0 || busy || Boolean(draft.fixedVisits?.[placeId] || draft.fixedVisits?.[draft.placeIds[index - 1]])} aria-label={`${place?.name || `여행지 ${index + 1}`} 위로`} onClick={() => { const ids = [...draft.placeIds]; [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; change({ placeIds: ids }); }}>↑ 위로</button><button type="button" disabled={index === draft.placeIds.length - 1 || busy || Boolean(draft.fixedVisits?.[placeId] || draft.fixedVisits?.[draft.placeIds[index + 1]])} aria-label={`${place?.name || `여행지 ${index + 1}`} 아래로`} onClick={() => { const ids = [...draft.placeIds]; [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]]; change({ placeIds: ids }); }}>↓ 아래로</button></>}
            </div>{place && <KakaoTaxiLink destination={place} />}</section>;
        })}</div>
        {owner ? <label className="travel-book-note"><span>동행자와 공유하는 여행 메모</span><textarea value={draft.note} onChange={event => change({ note: event.target.value })} maxLength={1200} placeholder="여행 준비물과 함께 확인할 내용을 적어보세요." /></label> : <p>{trip.payload.note || "아직 여행 메모가 없습니다."}</p>}
        {owner && <div className="travel-book-actions"><button type="button" className="primary" disabled={busy || !changed} onClick={() => run(async () => { const result = await travelRequest<AccountTrip>(`/${id}`, { revision: draftRevision.current, payload: draft }); draftRevision.current = result.revision; setDraft(result.payload); setConflict(false); await refresh(); setNotice("여행 변경 사항을 계정에 저장했어요."); })}>변경 사항 저장</button><span>{changed ? "저장하지 않은 변경 사항이 있어요." : "계정에 저장된 일정입니다."}</span></div>}
        {conflict && <section><h3>다른 화면의 수정본과 내 수정본이 달라요.</h3><p>내 수정본을 별도 여행으로 보관하거나 최신 버전을 불러올 수 있습니다.</p><div className="travel-book-actions"><button type="button" disabled={busy} onClick={() => run(async () => { copyId.current ||= crypto.randomUUID(); const result = await travelRequest<AccountTrip>("", { id: copyId.current, payload: draft }); router.push(`/my-trips/${result.id}`); })}>내 수정본을 새 여행으로 저장</button><button type="button" disabled={busy} onClick={() => run(async () => { const result = await travelRequest<TripDetail>(`/${id}`); setTrip(result); setDraft(result.payload); draftRevision.current = result.revision; setConflict(false); setNotice("최신 버전을 불러왔어요."); })}>내 수정 취소하고 최신 불러오기</button></div></section>}
      </section>
      <section className="account-settings" aria-labelledby="kakao-travel-title"><h2 id="kakao-travel-title">카카오톡으로 여행 잇기</h2><p>마지막으로 계정에 저장한 일정을 보냅니다.{changed && " 수정한 내용을 보내려면 먼저 변경 사항을 저장해 주세요."}</p><KakaoTravelShare trip={trip.payload} /><KakaoSendToSelf key={trip.id} tripId={trip.id} disabled={changed} /></section>
      <TripCompanions trip={trip} userId={userId} onChange={refresh} run={run} busy={busy} />
      <section className="account-settings"><h2>여행 보관 관리</h2><div className="travel-book-actions"><button type="button" onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify(trip.payload, null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = "wave-trip.json"; a.click(); URL.revokeObjectURL(url); }}>여행 파일로 내보내기</button>{owner && <button type="button" disabled={busy} onClick={() => setDeleting(true)}>계정에서 여행 삭제</button>}</div>
        {deleting && <div role="group" aria-label="계정 여행 삭제 확인"><p>이 여행과 동행자의 투표·의견을 모두 삭제할까요?</p><div className="travel-book-actions"><button type="button" onClick={() => setDeleting(false)}>유지하기</button><button type="button" disabled={busy} onClick={() => run(async () => { await travelRequest(`/${id}/delete`, { revision: draftRevision.current }); router.push("/my-trips"); })}>여행 삭제하기</button></div></div>}
      </section>
    </>}
  </>;
}
export default function AccountTripEditor({ id }: { id: string }) { return <AccountTravelGate next={`/my-trips/${id}`}>{userId => <Editor key={id} id={id} userId={userId} />}</AccountTravelGate>; }
