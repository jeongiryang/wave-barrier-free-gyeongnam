"use client";
import Link from "next/link";
import KakaoIcon from "./KakaoIcon";
import { useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { authClient } from "../../lib/auth/client";
import { publicTravelBody, travelCard, WAVE_ORIGIN } from "../../lib/kakao-travel.js";
import type { AccountTripPayload } from "../account-travel/types";
import { loadKakaoShare } from "./sdk";

export function KakaoTravelShare({ trip }: { trip: AccountTripPayload }) {
  const snapshot = JSON.stringify(publicTravelBody(trip));
  const [result, setResult] = useState<{ snapshot: string; url: string }>({ snapshot: "", url: "" });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const active = useRef(snapshot);
  useLayoutEffect(() => { active.current = snapshot; return () => { active.current = ""; }; }, [snapshot]);
  const pending = useRef(false);
  const url = result.snapshot === snapshot ? result.url : "";
  async function prepare() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setNotice("");
    try {
      if (window.location.origin !== WAVE_ORIGIN) throw new Error("카카오톡 공유는 WAVE 운영 사이트에서 이용해 주세요.");
      if (active.current !== snapshot) throw new Error("일정이 바뀌었어요. 현재 일정으로 다시 준비해 주세요.");
      if (!url) {
        const response = await fetch("/api/trips", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: snapshot });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "공유 일정을 만들지 못했습니다.");
        const target = new URL(body.url);
        if (target.origin !== window.location.origin || !/^\/trip\/[a-f0-9]{12}$/.test(target.pathname) || target.search || target.hash) throw new Error("공유 링크를 확인하지 못했습니다.");
        if (active.current !== snapshot) throw new Error("일정이 바뀌었어요. 현재 일정으로 다시 준비해 주세요.");
        setResult({ snapshot, url: target.href });
      }
      // A blocked SDK still leaves the newly issued public link available to copy.
      await loadKakaoShare(); setSdkReady(true);
    } catch (error) { setNotice(error instanceof Error ? error.message : "공유를 준비하지 못했습니다."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section aria-label="카카오톡 여행 카드">
    <div className="travel-book-actions"><button type="button" className="kakao-action-button" aria-busy={busy} disabled={busy} onClick={() => void prepare()}><KakaoIcon />{busy ? "공유 카드 준비 중…" : "카카오톡 공유 카드"}</button><Link href="/guide#kakao-share">공유 사용 방법</Link></div>
    {url && <><p><b>{trip.region}에서 함께하는 여행</b><br />{trip.travelStart} — {trip.travelEnd} · 여행지 {trip.placeIds.length}곳</p><p>이 링크는 받은 사람이 30일 동안 볼 수 있습니다. 편의 조건·메모·현재 위치는 포함하지 않습니다.</p><div className="travel-book-actions"><button type="button" className="kakao-action-button" aria-label="카카오톡으로 여행 공유" disabled={!sdkReady} onClick={() => { try { if (!window.Kakao?.Share) throw new Error(); window.Kakao.Share.sendDefault(travelCard(trip, url)); setNotice("카카오톡에서 보낼 대화방을 선택해 주세요."); } catch { setNotice("카카오톡 공유 창을 열지 못했어요. 팝업 허용을 확인하거나 링크를 복사해 주세요."); } }}><KakaoIcon />공유</button><button type="button" onClick={() => { if (!navigator.clipboard) { setNotice("아래 공유 일정 링크를 직접 복사해 주세요."); return; } void navigator.clipboard.writeText(url).then(() => setNotice("공유 링크를 복사했어요.")).catch(() => setNotice("아래 공유 일정 링크를 직접 복사해 주세요.")); }}>여행 링크 복사</button><a href={url}>공유 일정 열기</a></div></>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}

export function KakaoSendToSelf({ tripId, disabled = false }: { tripId: string; disabled?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [notice, setNotice] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [login, setLogin] = useState(false);
  const pending = useRef(false);
  async function send() {
    if (pending.current || disabled) return;
    pending.current = true; setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/kakao/message", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tripId }) });
      const body = await response.json();
      if (body.code === "CONSENT_REQUIRED") setConsent(true);
      if (response.status === 401) setLogin(true);
      if (!response.ok || body.ok !== true) throw new Error(body.error || "전송 결과를 확인하지 못했어요. 나와의 채팅을 먼저 확인해 주세요.");
      setConsent(false); setNotice("카카오톡 나와의 채팅으로 보냈어요. 내 여행 링크에서 이어갈 수 있습니다.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "전송하지 못했습니다."); }
    finally { pending.current = false; setBusy(false); }
  }
  async function grant() {
    if (pending.current || disabled) return;
    pending.current = true; setBusy(true);
    try {
      const result = await authClient.linkSocial({ provider: "kakao", scopes: ["talk_message"], callbackURL: `/my-trips/${tripId}`, errorCallbackURL: `/my-trips/${tripId}?kakao=cancelled` });
      if (result.error) { setLogin(true); throw new Error("다시 로그인한 뒤 카카오 메시지 전송에 동의해 주세요."); }
    } catch (error) { setNotice(error instanceof Error ? error.message : "카카오 연결을 확인해 주세요."); }
    finally { pending.current = false; setBusy(false); }
  }
  async function reauthenticate() {
    if (pending.current || disabled) return;
    pending.current = true; setBusy(true);
    try { const result = await authClient.signOut(); if (result.error) throw new Error(); router.push(`/login?next=${encodeURIComponent(`/my-trips/${tripId}`)}`); }
    catch { setNotice("다시 로그인할 준비를 하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section aria-label="카카오톡 나에게 보내기">{params.get("kakao") === "cancelled" && <p role="status">카카오 메시지 동의를 완료하지 않았어요. 원할 때 다시 연결할 수 있습니다.</p>}<p>계정에 저장한 제목·날짜·장소 수와 내 여행 링크를 나와의 채팅으로 보냅니다.</p><div className="travel-book-actions"><button type="button" className="kakao-action-button" aria-busy={busy} disabled={busy || disabled} onClick={() => void send()}><KakaoIcon />{busy ? "카카오톡 연결 중…" : "나와의 채팅에 보내기"}</button>{consent && <button type="button" disabled={busy || disabled} onClick={() => void grant()}>카카오 메시지 전송 동의하기</button>}{login && <button type="button" disabled={busy || disabled} onClick={() => void reauthenticate()}>다시 로그인하고 계속하기</button>}</div>{consent && <p>동의 후 여행으로 돌아오면 보내기 버튼을 다시 누르세요. 동의하지 않아도 다른 여행 기능은 계속 이용할 수 있어요.</p>}{notice && <p role="status">{notice}</p>}</section>;
}
