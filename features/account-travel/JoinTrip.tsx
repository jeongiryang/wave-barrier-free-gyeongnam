"use client";
import { useEffect, useRef, useState } from "react";
import AccountTravelGate from "./AccountTravelGate";
import { travelRequest } from "./client";
function JoinForm({ id, token }: { id: string; token: string }) {
  const [name, setName] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false); const lock = useRef(false);
  return <form className="account-settings" onSubmit={event => { event.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); void travelRequest(`/${id}/join`, { token, name }).then(() => { try { sessionStorage.removeItem(`wave-invite-${id}`); } catch {} window.location.replace(`/my-trips/${id}`); }).catch(error => { setNotice(error.message); setBusy(false); lock.current = false; }); }}>
    <h2>함께 여행을 준비할까요?</h2><p>참여하면 여행 일정과 공용 메모를 보고, 후보 장소에 투표하거나 의견을 남길 수 있어요.</p><label className="auth-field">동행자에게 표시할 이름<input value={name} onChange={event => setName(event.target.value)} maxLength={30} required autoComplete="nickname" /></label><p>표시 이름과 남긴 투표·의견은 이 여행의 참여자에게 보입니다. 내 계정의 편의 조건은 공유되지 않아요.</p><div className="travel-book-actions"><button type="submit" className="primary" disabled={busy || !token || !name.trim()}>{busy ? "참여하는 중…" : "여행에 참여하기"}</button></div><p role="status">{notice || (!token ? "초대 링크를 다시 열어 주세요." : "")}</p>
  </form>;
}
export default function JoinTrip({ id }: { id: string }) {
  const [token, setToken] = useState("");
  useEffect(() => { const frame = requestAnimationFrame(() => {
    const key = `wave-invite-${id}`, fromLink = new URLSearchParams(window.location.hash.slice(1)).get("token") || "";
    if (/^[a-f0-9]{64}$/.test(fromLink)) {
      setToken(fromLink); try { sessionStorage.setItem(key, JSON.stringify({ token: fromLink, expires: Date.now() + 30 * 60000 })); } catch {}
      history.replaceState(history.state, "", window.location.pathname);
    } else { try { const saved = JSON.parse(sessionStorage.getItem(key) || "null"); if (saved?.expires > Date.now()) setToken(saved.token); } catch {} }
  }); return () => cancelAnimationFrame(frame); }, [id]);
  return <AccountTravelGate next={`/join-trip/${id}`}>{() => <JoinForm id={id} token={token} />}</AccountTravelGate>;
}
