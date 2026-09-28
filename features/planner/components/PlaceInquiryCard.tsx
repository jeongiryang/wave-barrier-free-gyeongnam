"use client";
import LoadingState from "../../../components/LoadingState";
import { lazy, Suspense, useCallback, useState } from "react";
import { defaultInquiryOptions } from "../../../lib/place-decision-tools.js";
import type { Place } from "../types";
// 정적으로 불러온다: 이 카드가 이미 로드된 뒤에는 도움 요청 화면을 열 때 새 네트워크 요청이
// 없어야 한다(오프라인에서도 항상 동작). PlaceInquiryDialog 안 행동 줄에서도 이 화면을 연다.
import HelpRequestDialog from "./HelpRequestDialog";

const InquiryDialog = lazy(() => import("./PlaceInquiryDialog").catch(() => ({ default: ({ onClose }: { onClose: () => void }) => <p role="alert">문의 카드를 열지 못했어요. <button type="button" onClick={onClose} title="닫기"><span aria-hidden="true">×</span><span className="sr-only">닫기</span></button></p> })));

export default function PlaceInquiryCard({ place, en, suggestedOption, onsiteLabel, startMode }: { place: Place; en: boolean; suggestedOption?: string; onsiteLabel?: string; startMode?: "inquiry" | "communication" }) {
  const [open, setOpen] = useState(Boolean(startMode));
  const [helpOpen, setHelpOpen] = useState(false);
  const [selected, setSelected] = useState(() => {
    const defaults = defaultInquiryOptions(place);
    return startMode === "communication" && !defaults.includes("ordering") ? [...defaults, "ordering"] : defaults;
  });
  const [extra, setExtra] = useState("");
  const [startCommunicating, setStartCommunicating] = useState(startMode === "communication");
  const close = useCallback(() => setOpen(false), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const openHelp = useCallback(() => { setOpen(false); setHelpOpen(true); }, []);
  function openInquiry(communicating = false) {
    if (suggestedOption) setSelected(current => current.includes(suggestedOption) ? current : [...current, suggestedOption]);
    setStartCommunicating(communicating);
    setOpen(true);
  }
  return <section className="place-inquiry-entry place-purpose-entry">
    <div><h3>{en ? "What would you like to do?" : "어떤 도움이 필요하세요?"}</h3><p>{en ? "Choose a tool for your purpose." : "필요한 기능을 골라 바로 시작하세요."}</p></div>
    <div className="place-purpose-options">
      <button type="button" onClick={event => { event.currentTarget.focus({ preventScroll: true }); openInquiry(); }}><strong>{en ? "Prepare questions" : "방문 전에 물어보기"}</strong><small>{en ? "Write, show or save a question card" : "질문을 골라 보여주거나 저장해요"}</small></button>
      <button type="button" onClick={event => { event.currentTarget.focus({ preventScroll: true }); openInquiry(true); }}><strong>{onsiteLabel || (en ? "Talk using the screen" : "현장에서 화면으로 대화")}</strong><small>{en ? "Use the communication board with staff" : "직원과 화면을 보며 의사를 전해요"}</small></button>
      <button type="button" onClick={event => { event.currentTarget.focus({ preventScroll: true }); openHelp(); }}><strong>{en ? "Ask for help" : "도움 요청하기"}</strong><small>{en ? "Show the help you need" : "지금 필요한 도움을 전달해요"}</small></button>
    </div>
    {open && <Suspense fallback={<LoadingState>{en ? "Preparing your card…" : "문의 카드를 준비하고 있어요…"}</LoadingState>}><InquiryDialog place={place} en={en} selected={selected} extra={extra} onSelection={setSelected} onExtra={setExtra} onClose={close} onHelpRequest={openHelp} startCommunicating={startCommunicating} /></Suspense>}
    {helpOpen && <HelpRequestDialog placeName={place.name} placeAddress={place.address ?? null} placeRegion={place.city ?? null} onClose={closeHelp} />}
  </section>;
}
