"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useHydratedSession } from "../auth/hooks/useHydratedSession";
import { bookToAccountTrip } from "../../lib/account-travel/model.js";
import type { TravelBook } from "../../lib/travel-book.js";
import { travelRequest } from "./client";
import type { AccountTrip, AccountTripPayload } from "./types";
import { KakaoSendToSelf, KakaoTravelShare } from "../kakao-travel/KakaoTravelActions";

export default function CloudSaveAction({ book }: { book: TravelBook }) {
  const { data, isPending } = useHydratedSession();
  const userId = data?.user?.id;
  const [state, setState] = useState<{ key?: string; userId?: string; message: string; id?: string }>({ message: "" });
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const attempt = useRef({ key: "", id: "" });
  const key = JSON.stringify([userId, book.title, book.region, book.travelStart, book.travelEnd, book.dayStartTime, book.travelMode, book.themes, book.theme, book.status, book.note, book.places.map(place => place.id), book.scheduleAssignments, book.visitMinutesByPlaceId, book.fixedVisits, book.dayDeadlines, book.breakMinutesByPlaceId, book.restPurposeByPlaceId]);
  async function save() {
    if (!userId || pending.current) return;
    pending.current = true; setBusy(true);
    try {
      if (attempt.current.key !== key) attempt.current = { key, id: crypto.randomUUID() };
      const trip = await travelRequest<AccountTrip>("", { id: attempt.current.id, payload: bookToAccountTrip(book) });
      setState({ key, userId, message: "계정에 저장했어요. 다른 기기에서도 이 여행을 열 수 있습니다.", id: trip.id });
    } catch (error) { setState({ key, userId, message: error instanceof Error ? error.message : "저장하지 못했습니다." }); }
    finally { pending.current = false; setBusy(false); }
  }
  if (isPending) return null;
  let shareTrip;
  try { shareTrip = bookToAccountTrip(book) as AccountTripPayload; } catch { /* Legacy or incomplete local travel remains usable. */ }
  return <div className="account-trip-save">
    <div className="travel-book-actions">{userId ? <button type="button" disabled={busy} onClick={() => void save()}>{busy ? "계정에 저장 중…" : "계정에 저장"}</button> : <Link href="/login?next=%2Ftravel-book">로그인하고 여러 기기에서 이어가기 →</Link>}</div>
    {userId && <small>여행 제목·장소·일정·메모를 저장합니다. 편의 조건은 별도로 선택해 저장할 수 있어요.</small>}
    {userId && state.userId === userId && state.key === key && state.message && <p role="status">{state.message} {state.id && <Link href={`/my-trips/${state.id}`}>저장한 여행 열기 →</Link>}</p>}
    {shareTrip && <KakaoTravelShare trip={shareTrip} />}
    {userId && state.userId === userId && state.key === key && state.id && <KakaoSendToSelf key={state.id} tripId={state.id} />}
  </div>;
}
