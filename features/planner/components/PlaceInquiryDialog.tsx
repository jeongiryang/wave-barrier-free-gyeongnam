"use client";
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { inquiryOptions, inquiryText } from "../../../lib/place-decision-tools.js";
import { usePlaceDialogFocus } from "../hooks/usePlaceDialogFocus";
import { downloadInquiryCard } from "../inquiry-card-export";
import type { Place } from "../types";

export default function PlaceInquiryDialog({ place, en, selected, extra, onSelection, onExtra, onClose }: {
  place: Place; en: boolean; selected: string[]; extra: string;
  onSelection: (ids: string[]) => void; onExtra: (text: string) => void; onClose: () => void;
}): ReactNode {
  const dialog = usePlaceDialogFocus(true, onClose);
  const [large, setLarge] = useState(false);
  const [notice, setNotice] = useState("");
  const [copyFallback, setCopyFallback] = useState(false);
  const [exporting, setExporting] = useState(false);
  const text = inquiryText(place.name, selected, extra);
  const ready = selected.length > 0 || extra.trim().length > 0;
  const say = (ko: string, english: string) => en ? english : ko;
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopyFallback(false); setNotice(say("문의 내용을 복사했어요.", "Your questions were copied.")); }
    catch { setCopyFallback(true); setNotice(say("아래 내용을 선택해서 복사해 주세요.", "Select and copy the text below.")); }
  }
  async function download() {
    if (exporting) return;
    setExporting(true);
    try { await downloadInquiryCard(place.name, text); setNotice(say("문의 카드를 이미지로 저장했어요.", "Your inquiry card was saved as an image.")); }
    catch { setNotice(say("이미지를 만들지 못했어요. 내용 복사를 이용해 주세요.", "The image could not be created. You can copy the text instead.")); }
    finally { setExporting(false); }
  }
  return createPortal(<dialog ref={dialog} className="region-change-dialog inquiry-dialog" data-large={large} aria-labelledby="inquiry-title">
    <header><div><p className="section-kicker">WAVE · {say("방문 전 문의", "VISITOR CARD")}</p><h2 id="inquiry-title" tabIndex={-1}>{say("이렇게 물어보세요.", "Ask in Korean.")}</h2></div><button type="button" onClick={onClose} aria-label={say("문의 카드 닫기", "Close inquiry card")}>×</button></header>
    {!large && <div className="inquiry-editor"><fieldset><legend>{say("물어보고 싶은 내용", "Choose your questions")}</legend><div>{inquiryOptions.map(option => <label key={option.id}><input type="checkbox" checked={selected.includes(option.id)} onChange={event => { onSelection(event.target.checked ? [...selected, option.id] : selected.filter(id => id !== option.id)); setNotice(""); }} /><span lang="ko">{option.label}</span></label>)}</div></fieldset><label className="inquiry-extra">{say("추가로 전하고 싶은 말", "Add your own words")}<textarea value={extra} maxLength={500} rows={2} onChange={event => { onExtra(event.target.value); setNotice(""); }} placeholder={say("직접 전하고 싶은 내용을 적어주세요.", "Write what you would like to say.")} /></label></div>}
    <div className="inquiry-card-preview" lang="ko"><small>{place.name}</small><p>{text}</p><span>WAVE</span></div>
    <div className="inquiry-actions"><button type="button" aria-pressed={large} onClick={() => setLarge(!large)}>{large ? say("질문 수정하기", "Edit questions") : say("큰 글씨로 보기", "Show large text")}</button><button type="button" disabled={!ready} onClick={() => void copy()}>{say("내용 복사", "Copy text")}</button><button type="button" disabled={!ready || exporting} aria-busy={exporting} onClick={() => void download()}>{exporting ? say("이미지 만드는 중…", "Creating image…") : say("이미지 저장", "Save image")}</button></div>
    {notice && <p role="status">{notice}</p>}
    {copyFallback && <textarea className="inquiry-copy-fallback" aria-label={say("복사할 문의 내용", "Inquiry text to copy")} readOnly value={text} rows={6} onFocus={event => event.currentTarget.select()} />}
  </dialog>, document.body);
}
