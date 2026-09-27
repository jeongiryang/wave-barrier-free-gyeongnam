"use client";
import { lazy, Suspense, useState } from "react";
import LoadingState from "../../../components/LoadingState";
import type { Place } from "../types";

const Inquiry = lazy(() => import("./PlaceInquiryCard"));
const Preview = lazy(() => import("./PlaceArrivalPreview"));
const Transcript = lazy(() => import("./PlaceAudioGuide"));

/** Reuse the same venue tools from every Naru entry point, including the home page. */
export default function NaruPlaceTools({ tool, places, initialPlaceId, onFind }: {
  tool: string; places: Place[]; initialPlaceId: string; onFind: () => void;
}) {
  const [selectedId, setSelectedId] = useState(initialPlaceId);
  const place = places.find(item => item.id === selectedId) || places[0];
  if (!place) return <div role="status"><p>여행지를 찾거나 일정에 담으면 장소별 정보를 확인할 수 있어요.</p><button type="button" onClick={onFind}>여행지 찾기</button></div>;
  return <div className="naru-place-tools">
    <label>장소 선택<select value={place.id} onChange={event => setSelectedId(event.target.value)}>{places.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <Suspense fallback={<LoadingState>장소 정보를 준비하고 있어요…</LoadingState>}>
      {tool === "inquiry" ? <Inquiry key={place.id} place={place} en={false} /> : tool === "preview" ? <Preview key={place.id} place={place} /> : <Transcript key={place.id} id={place.id} transcript />}
    </Suspense>
  </div>;
}
