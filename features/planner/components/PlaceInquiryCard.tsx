"use client";
import { lazy, Suspense, useCallback, useState } from "react";
import { defaultInquiryOptions } from "../../../lib/place-decision-tools.js";
import type { Place } from "../types";

const InquiryDialog = lazy(() => import("./PlaceInquiryDialog").catch(() => ({ default: ({ onClose }: { onClose: () => void }) => <p role="alert">문의 카드를 열지 못했어요. <button type="button" onClick={onClose}>닫기</button></p> })));

export default function PlaceInquiryCard({ place, en }: { place: Place; en: boolean }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => defaultInquiryOptions(place));
  const [extra, setExtra] = useState("");
  const close = useCallback(() => setOpen(false), []);
  return <section className="place-inquiry-entry">
    <div><h3>{en ? "Ask before you visit" : "방문 전에 물어보세요."}</h3><p>{en ? "Choose a question and show a Korean card, or keep it for your trip." : "필요한 질문을 골라 큰 글씨로 보여주거나 여행에 챙겨두세요."}</p></div>
    <button type="button" onClick={() => setOpen(true)}>{en ? "Make an inquiry card" : "문의 카드 만들기"} ↗</button>
    {open && <Suspense fallback={<p role="status">{en ? "Preparing your card…" : "문의 카드를 준비하고 있어요…"}</p>}><InquiryDialog place={place} en={en} selected={selected} extra={extra} onSelection={setSelected} onExtra={setExtra} onClose={close} /></Suspense>}
  </section>;
}
