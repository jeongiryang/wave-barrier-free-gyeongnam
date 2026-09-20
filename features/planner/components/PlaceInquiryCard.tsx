"use client";
import LoadingState from "../../../components/LoadingState";
import { lazy, Suspense, useCallback, useState } from "react";
import { defaultInquiryOptions } from "../../../lib/place-decision-tools.js";
import type { Place } from "../types";
// 정적으로 불러온다: 이 카드가 이미 로드된 뒤에는 도움 요청 화면을 열 때 새 네트워크 요청이
// 없어야 한다(오프라인에서도 항상 동작). PlaceInquiryDialog 안 행동 줄에서도 이 화면을 연다.
import HelpRequestDialog from "./HelpRequestDialog";

const InquiryDialog = lazy(() => import("./PlaceInquiryDialog").catch(() => ({ default: ({ onClose }: { onClose: () => void }) => <p role="alert">문의 카드를 열지 못했어요. <button type="button" onClick={onClose}>닫기</button></p> })));

export default function PlaceInquiryCard({ place, en, suggestedOption, onsiteLabel }: { place: Place; en: boolean; suggestedOption?: string; onsiteLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selected, setSelected] = useState(() => defaultInquiryOptions(place));
  const [extra, setExtra] = useState("");
  const [startCommunicating, setStartCommunicating] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const openHelp = useCallback(() => { setOpen(false); setHelpOpen(true); }, []);
  function openInquiry(communicating = false) {
    if (suggestedOption) setSelected(current => current.includes(suggestedOption) ? current : [...current, suggestedOption]);
    setStartCommunicating(communicating);
    setOpen(true);
  }
  return <section className="place-inquiry-entry">
    <div><h3>{en ? "Ask before you visit" : "방문 전에 물어보세요."}</h3><p>{en ? "Choose a question and show a Korean card, or keep it for your trip." : "필요한 질문을 골라 큰 글씨로 보여주거나 여행에 챙겨두세요."}</p></div>
    <button type="button" onClick={() => openInquiry()}>{en ? "Make an inquiry card" : "문의 카드 만들기"} ↗</button>
    {onsiteLabel && <button type="button" onClick={() => openInquiry(true)}>{onsiteLabel}</button>}
    {open && <Suspense fallback={<LoadingState>{en ? "Preparing your card…" : "문의 카드를 준비하고 있어요…"}</LoadingState>}><InquiryDialog place={place} en={en} selected={selected} extra={extra} onSelection={setSelected} onExtra={setExtra} onClose={close} onHelpRequest={openHelp} startCommunicating={startCommunicating} /></Suspense>}
    {helpOpen && <HelpRequestDialog placeName={place.name} placeAddress={place.address ?? null} placeRegion={place.city ?? null} onClose={closeHelp} />}
  </section>;
}
