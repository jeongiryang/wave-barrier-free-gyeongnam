"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TripDetail } from "./types";
import { travelRequest } from "./client";

export default function TripCompanions({ trip, userId, onChange, run, busy }: { trip: TripDetail; userId: string; onChange: () => Promise<void>; run: (action: () => Promise<void>) => void; busy: boolean }) {
  const router = useRouter();
  const [invitation, setInvitation] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const [comment, setComment] = useState("");
  const [confirm, setConfirm] = useState("");
  async function invite(enabled: boolean) {
    const result = await travelRequest<{ token: string | null }>(`/${trip.id}/invitation`, { enabled });
    setInvitation(result.token ? `${window.location.origin}/join-trip/${trip.id}#token=${result.token}` : "");
    setCopyNotice(enabled ? "7일 동안 사용할 초대 링크를 만들었어요. 이전 초대 링크는 만료됩니다." : "새 참여를 막았어요. 이미 참여한 동행자는 아래에서 관리할 수 있습니다.");
    await onChange();
  }
  return <section className="account-settings" aria-labelledby="companions-title">
    <h2 id="companions-title">함께 만드는 여행</h2><p>후보 장소에 투표하고 의견을 나눠보세요. 일정 변경은 여행을 만든 사람이 반영합니다.</p>
    {trip.role === "owner" && <section><h3>동행자 초대</h3><p>링크를 받은 사람은 로그인 후 표시 이름을 정해 참여합니다. 여행 날짜·장소·공용 메모·의견이 동행자에게 보입니다.</p>
      <div className="travel-book-actions"><button type="button" disabled={busy} onClick={() => run(() => invite(true))}>{trip.invitationActive ? "초대 링크 새로 만들기" : "초대 링크 만들기"}</button><button type="button" disabled={busy || !trip.invitationActive} onClick={() => run(() => invite(false))}>초대 중지</button></div>
      {invitation && <><label className="auth-field">동행자 초대 링크<input readOnly value={invitation} onFocus={event => event.currentTarget.select()} /></label><div className="travel-book-actions"><button type="button" onClick={() => void navigator.clipboard?.writeText(invitation).then(() => setCopyNotice("초대 링크를 복사했어요.")).catch(() => setCopyNotice("위 링크를 선택해 직접 복사해 주세요."))}>초대 링크 복사</button></div></>}
      <p role="status">{copyNotice}</p></section>}
    <section><h3>동행자 {trip.members.length + 1}명</h3><p>여행 만든 사람 · 일정 편집</p>{trip.members.map(member => <div className="travel-book-actions" key={member.userId}><span>{member.name}{member.userId === userId ? " (나)" : ""}</span>{(trip.role === "owner" || member.userId === userId) && <button type="button" disabled={busy} onClick={() => setConfirm(member.userId)}>{member.userId === userId ? "참여 취소" : `${member.name} 참여 해제`}</button>}</div>)}
      {confirm && <div role="group" aria-label="참여 해제 확인"><p>해당 동행자의 참여·투표·의견을 삭제할까요?{confirm !== userId && " 다시 참여하지 않도록 기존 초대 링크도 만료됩니다."}</p><div className="travel-book-actions"><button type="button" onClick={() => setConfirm("")}>유지하기</button><button type="button" disabled={busy} onClick={() => run(async () => { await travelRequest(`/${trip.id}/participate`, { action: "remove-member", userId: confirm }); if (confirm === userId) router.push("/my-trips"); else { setInvitation(""); setConfirm(""); await onChange(); } })}>참여 해제하기</button></div></div>}
    </section>
    <section><h3>여행 의견</h3><form onSubmit={event => { event.preventDefault(); run(async () => { await travelRequest(`/${trip.id}/participate`, { action: "comment", content: comment }); setComment(""); await onChange(); }); }}><label className="travel-book-note"><span>동행자에게 의견 남기기</span><textarea value={comment} onChange={event => setComment(event.target.value)} maxLength={500} required placeholder="첫날은 바닷가부터 가면 어떨까요?" /></label><div className="travel-book-actions"><button type="submit" disabled={busy || !comment.trim()}>의견 남기기</button></div></form>
      {!trip.comments.length && <p>첫 의견을 남겨 여행을 함께 준비해 보세요.</p>}
      {trip.comments.map(item => <article key={item.id}><p><b>{item.name}</b> · {new Date(Number(item.createdAt)).toLocaleString("ko-KR")}</p><p>{item.content}</p>{(item.userId === userId || trip.role === "owner") && <div className="travel-book-actions"><button type="button" disabled={busy} onClick={() => run(async () => { await travelRequest(`/${trip.id}/participate`, { action: "delete-comment", commentId: item.id }); await onChange(); })}>의견 삭제</button></div>}</article>)}
    </section>
  </section>;
}
