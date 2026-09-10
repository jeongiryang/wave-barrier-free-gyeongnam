"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AccountTravelGate from "./AccountTravelGate";
import { travelRequest } from "./client";
import type { AccountTrip } from "./types";

function TravelList({ userId }: { userId: string }) {
  const [trips, setTrips] = useState<AccountTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try { const result = await travelRequest<{ trips: AccountTrip[] }>("", undefined, signal); if (!signal?.aborted) setTrips(result.trips); }
    catch (failure) { if (!signal?.aborted) { setTrips([]); setError(failure instanceof Error ? failure.message : "여행을 불러오지 못했습니다."); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); const frame = requestAnimationFrame(() => void load(controller.signal)); return () => { cancelAnimationFrame(frame); controller.abort(); }; }, [load, userId]);
  return <>
    <div className="travel-book-actions"><Link className="primary" href="/planner">새 여행 계획하기 →</Link><Link href="/travel-book">기존 일정에서 골라 저장</Link><button type="button" onClick={() => void load()} disabled={loading}>목록 새로고침</button><Link href="/guide#account-travel">여행 저장·동행 도움말</Link></div>
    <p role="status">{loading ? "저장한 여행을 불러오고 있어요." : `${trips.length}개의 여행 · 계정에 저장한 일정은 여러 기기에서 이어집니다.`}</p>
    {error && <p role="alert">{error}</p>}
    {!loading && !error && !trips.length && <section className="travel-book-empty"><span aria-hidden="true">＋</span><h2>함께 떠날 첫 여행을 만들어 보세요.</h2><p>여행 계획에서 장소를 담고 ‘계정에 저장’을 누르세요.</p><small>기존 일정은 직접 고른 여행만 계정으로 가져옵니다.</small></section>}
    {trips.map(trip => <article className="travel-book-card" key={trip.id}>
      <div className="travel-book-cover"><span aria-hidden="true">W</span><div><small>{trip.role === "owner" ? "내가 만든 여행" : "함께하는 여행"}</small><strong>{trip.payload.region}</strong></div></div>
      <div className="travel-book-card-body"><header><div><span>{trip.payload.status === "visited" ? "다녀온 여행" : "다가오는 여행"}</span><h2>{trip.payload.title}</h2><p>{trip.payload.travelStart} — {trip.payload.travelEnd}</p></div></header><p>여행지 {trip.payload.placeIds.length}곳 · {trip.role === "owner" ? "일정 편집과 동행자 초대" : "장소 투표와 의견 나누기"}</p><div className="travel-book-actions"><Link className="primary" href={`/my-trips/${trip.id}`}>여행 이어가기 →</Link></div></div>
    </article>)}
  </>;
}
export default function AccountTravelHome() { return <AccountTravelGate next="/my-trips">{userId => <TravelList userId={userId} />}</AccountTravelGate>; }
