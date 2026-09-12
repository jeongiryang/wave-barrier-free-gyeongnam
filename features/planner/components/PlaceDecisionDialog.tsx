"use client";
import LoadingState from "../../../components/LoadingState";

import { lazy, Suspense, useState, type RefObject } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import type { Place } from "../types";
import { originalLanguage } from "../place-copy";
import type { ExplorationPlaceAction } from "../../../lib/exploration-place-action.js";

function DetailsUnavailable() {
  const { locale } = useSitePreferences();
  return <p role="alert">{locale === "en" ? "These details could not load. Close this dialog and reload the page to try again. Your itinerary remains available." : "상세 화면을 불러오지 못했어요. 닫고 페이지를 새로 열어 다시 시도해 주세요. 일정은 계속 이용할 수 있습니다."}</p>;
}
const PlaceDecisionContent = lazy(() => import("./PlaceDecisionContent").catch(() => ({ default: DetailsUnavailable })));
const PlaceAudioGuide = lazy(() => import('./PlaceAudioGuide'));

export type PlaceDecisionDialogProps = {
  place: Place;
  region: string;
  saved: boolean;
  canSave?: boolean;
  explorationAction?: ExplorationPlaceAction;
  feedbackText: string;
  feedbackState: "idle" | "sending" | "done" | "error";
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
  onToggleSaved: (acknowledgedKey?: string) => void;
  onFeedbackChange: (value: string) => void;
  onSubmitFeedback: () => void;
};

function PlaceSaveAction({ saved, canSave, explorationAction, onToggleSaved, en }: Pick<PlaceDecisionDialogProps, "saved" | "canSave" | "explorationAction" | "onToggleSaved"> & { en: boolean }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const needsAcknowledgement = !saved && canSave === false && explorationAction?.kind === "acknowledge";
  const mismatch = explorationAction?.kind === "mismatch";
  const say = (ko: string, english: string) => en ? english : ko;
  return <>
    {needsAcknowledgement && <div className="place-unknown-consent">
      <p id="place-unknown-notice" role="status"><strong>{explorationAction.providerError ? say("편의정보 제공처에 연결하지 못했어요.", "The facility information provider could not be reached.") : say("필요한 편의가 아직 미확인이에요.", "Some required facilities are still unverified.")}</strong><br />{say("시설이 없다는 뜻은 아닙니다. 선택한 편의는 유지하며, 후보로 담아도 편의가 확인된 장소로 바뀌지 않습니다. 방문 전에 시설에 확인해 주세요.", "Missing information does not mean a facility is absent. Your needs stay selected, and saving this candidate does not verify its facilities. Check with the venue before visiting.")}</p>
      <label><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} aria-describedby="place-unknown-notice" /><span>{say("미확인 편의를 방문 전에 확인할 후보로 담기", "Save as a candidate whose unverified facilities I will check before visiting")}</span></label>
    </div>}
    <button type="button" aria-pressed={saved} disabled={!saved && canSave === false && !(needsAcknowledgement && acknowledged)} onClick={() => onToggleSaved(needsAcknowledgement && acknowledged ? explorationAction.key : undefined)}>{saved ? say("일정에서 빼기", "Remove from itinerary") : say("일정에 추가", "Add to itinerary")}<span aria-hidden="true">{saved ? "−" : "+"}</span></button>
    {!saved && canSave === false && !needsAcknowledgement && <p>{mismatch ? say("필요한 편의가 제공되지 않는 것으로 기록된 장소는 추가할 수 없어요. 다른 후보를 살펴봐 주세요.", "This place reports a required facility as unavailable and cannot be added. Please consider another candidate.") : say("현재 검색의 장소를 확인한 뒤 담을 수 있어요. 조건이나 검색 결과가 바뀌었다면 다시 찾아 이용 정보를 열어 주세요.", "Open a place from your current search before adding it. If your preferences or results changed, search again and reopen its details.")}</p>}
  </>;
}

export default function PlaceDecisionDialog(props: PlaceDecisionDialogProps) {
  const { place, region, dialogRef, onClose } = props;
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const location = place.city || region;
  return <dialog className="place-modal native-place-dialog" aria-labelledby="place-modal-title" ref={dialogRef}>
      <button className="modal-close" type="button" onClick={onClose} aria-label={en ? "Close" : "닫기"}>×</button>
      <div className="modal-visual" style={place.image ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(4,25,44,.72)), url("${place.image}")` } : undefined}><span lang={originalLanguage(location)}>{location}</span></div>
      <div className="modal-body">
        <p className="section-kicker">{en ? "Facility information" : "편의정보 자세히 보기"}</p><h2 id="place-modal-title" lang={originalLanguage(place.name)} tabIndex={-1}>{place.name}</h2><p lang={originalLanguage(place.address || place.summary)}>{place.address || place.summary}</p>
        {en && <p className="original-language-note">Place names, addresses and facility evidence are shown in their original language, which may be Korean. Visitor stories are not translated.</p>}
        <PlaceSaveAction key={`${place.id}:${props.explorationAction?.key || "regular"}`} saved={props.saved} canSave={props.canSave} explorationAction={props.explorationAction} onToggleSaved={props.onToggleSaved} en={en} />
        <Suspense fallback={<LoadingState>{en ? "Loading place details…" : "상세 정보를 불러오는 중…"}</LoadingState>}><PlaceDecisionContent {...props} location={location} /></Suspense>
        <Suspense fallback={null}><PlaceAudioGuide key={place.id} id={place.id} /></Suspense>
      </div>
  </dialog>;
}
