"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import CommunityHeader from "../../components/CommunityHeader";
import SkipLink from "../../components/SkipLink";
import GithubFooterLink from "../../components/GithubFooterLink";
import { buildTravelJournalHref } from "../../lib/community/field-report.js";
import type { TravelBook } from "../../lib/travel-book.js";
import { useTravelBook } from "../../features/travel-book/useTravelBook";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" });

function formatDate(value: string, formatter = dateFormatter) {
  return formatter.format(new Date(`${value}T12:00:00`));
}

function journalHref(book: TravelBook) {
  return buildTravelJournalHref({
    places: book.places.map((place) => ({ id: place.id, name: place.name, day: book.scheduleAssignments[place.id] || book.travelStart })),
    region: book.region,
    visitDate: book.travelStart,
  });
}

function TravelBookCard({ book, onUpdate, onRemove, onRestore }: {
  book: TravelBook;
  onUpdate: (id: string, patch: Partial<Pick<TravelBook, "status" | "note">>) => void;
  onRemove: (id: string) => void;
  onRestore: (book: TravelBook) => void;
}) {
  const [deleteReady, setDeleteReady] = useState(false);
  const [note, setNote] = useState(book.note);
  const [noteState, setNoteState] = useState<"idle" | "editing" | "saved">("idle");
  const [announcement, setAnnouncement] = useState("");
  const cardId = useId().replace(/:/g, "");
  const deletePanelId = `travel-book-delete-${cardId}`;
  const noteHelpId = `travel-book-note-help-${cardId}`;
  const noteStatusId = `travel-book-note-status-${cardId}`;
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const deletePanelRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => [...new Set(Object.values(book.scheduleAssignments))].sort(), [book.scheduleAssignments]);
  const cover = book.places.find((place) => place.image)?.image || "";

  const closeDelete = useCallback(() => {
    setDeleteReady(false);
    window.requestAnimationFrame(() => deleteTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!deleteReady) return;
    deletePanelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeDelete();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [closeDelete, deleteReady]);

  function updateStatus(status: TravelBook["status"]) {
    onUpdate(book.id, { status });
    setAnnouncement(status === "visited" ? "다녀온 여행으로 표시했습니다." : "갈 여행으로 표시했습니다.");
  }

  function saveNote() {
    if (note !== book.note) onUpdate(book.id, { note });
    setNoteState("saved");
  }

  return <article className="travel-book-card" data-status={book.status}>
    <div className="travel-book-cover">
      {cover ? <Image src={cover} alt="" fill sizes="(max-width: 860px) 100vw, 360px" unoptimized /> : <span aria-hidden="true">W</span>}
      <div><small>{book.status === "visited" ? "다녀온 여행" : "다가오는 여행"}</small><strong>{book.region}</strong></div>
    </div>
    <div className="travel-book-card-body">
      <header>
        <div><span>{book.theme || "맞춤 여행"} · {book.places.length}곳</span><h2>{book.title}</h2><p>{formatDate(book.travelStart)}{book.travelEnd !== book.travelStart ? ` — ${formatDate(book.travelEnd)}` : ""}</p></div>
        <div className="travel-book-status" role="group" aria-label={`${book.title} 여행 상태`}>
          <button type="button" aria-pressed={book.status === "planned"} onClick={() => updateStatus("planned")}>갈 여행</button>
          <button type="button" aria-pressed={book.status === "visited"} onClick={() => updateStatus("visited")}>다녀온 여행</button>
        </div>
      </header>
      <p className="travel-book-card-status" role="status" aria-live="polite">{announcement}</p>
      {book.profiles.length > 0 && <ul className="travel-book-profiles" aria-label="선택한 편의조건">{book.profiles.map((profile) => <li key={profile}>{profile}</li>)}</ul>}
      <div className="travel-book-days">
        {days.map((day, dayIndex) => <section key={day}>
          <header><small>DAY {String(dayIndex + 1).padStart(2, "0")}</small><strong>{formatDate(day, shortDateFormatter)} · {book.dayStartTime} 시작</strong></header>
          <ol>{book.places.filter((place) => book.scheduleAssignments[place.id] === day).map((place, placeIndex) => <li key={place.id}>
            <span>{placeIndex + 1}</span><div><strong>{place.name}</strong><small>{place.address || place.city}</small></div><em>{place.score && place.score > 0 ? `공식 편의 ${place.score}%` : "방문 전 재확인"}</em>
          </li>)}</ol>
        </section>)}
      </div>
      <label className="travel-book-note">
        <span>{book.status === "visited" ? "이 여행에서 기억할 점" : "출발 전에 기억할 점"}</span>
        <textarea maxLength={1200} value={note} aria-describedby={`${noteHelpId} ${noteStatusId}`} placeholder={book.status === "visited" ? "현장에서 편했던 동선이나 다음 여행에 참고할 점을 남겨보세요." : "운영시간, 준비물처럼 다시 확인할 내용을 남겨보세요."} onChange={(event) => { setNote(event.currentTarget.value); setNoteState("editing"); }} onBlur={saveNote} />
        <small id={noteHelpId}>메모도 이 기기에만 저장됩니다. 입력 후 다른 곳을 누르면 자동 저장돼요.</small>
        <small id={noteStatusId} className="travel-book-note-status" role="status" aria-live="polite">{noteState === "saved" ? "메모를 이 기기에 저장했습니다." : noteState === "editing" ? `편집 중 · ${note.length}/1,200자` : `${note.length}/1,200자`}</small>
      </label>
      <div className="travel-book-actions">
        <button type="button" className="primary" onClick={() => onRestore(book)}>이 일정 다시 열기 <span aria-hidden="true">→</span></button>
        <Link href="/photo-course">사진으로 코스 되살리기</Link>
        <Link href={journalHref(book)}>여행 후기 초안</Link>
      </div>
      <div className="travel-book-delete">
        <button ref={deleteTriggerRef} type="button" aria-expanded={deleteReady} aria-controls={deletePanelId} onClick={() => deleteReady ? closeDelete() : setDeleteReady(true)}>여행집에서 삭제</button>
        {deleteReady && <div ref={deletePanelRef} id={deletePanelId} className="travel-book-delete-confirm" role="group" aria-label={`${book.title} 삭제 확인`}><span>이 기기에서 이 여행을 지울까요?</span><button type="button" onClick={() => onRemove(book.id)}>삭제 확인</button><button type="button" onClick={closeDelete}>취소</button></div>}
      </div>
    </div>
  </article>;
}

export default function TravelBookPage() {
  const { books, hydrated, update, remove, restore } = useTravelBook();
  const [announcement, setAnnouncement] = useState("");
  const visitedCount = books.filter((book) => book.status === "visited").length;

  return <main className="travel-book-page">
    <SkipLink href="#travel-book-main">여행집 본문으로 바로가기</SkipLink>
    <CommunityHeader current="travel-book" />
    <section className="travel-book-hero" id="travel-book-main">
      <div><p>MY LOCAL TRAVEL BOOK</p><h1>여행은 다녀온 뒤에도<br /><em>다음 장으로 이어져요.</em></h1><span>계정 없이 이 기기에만 남기는 나의 경남 여행집입니다. 갈 여행을 준비하고, 다녀온 여행은 메모·사진 코스·후기로 이어보세요.</span></div>
      <dl aria-label="여행집 요약"><div><dt>보관한 여행</dt><dd>{hydrated ? books.length : "—"}</dd></div><div><dt>다녀온 여행</dt><dd>{hydrated ? visitedCount : "—"}</dd></div><div><dt>저장 위치</dt><dd>이 기기</dd></div></dl>
    </section>
    <section className="travel-book-privacy" aria-label="여행집 개인정보 안내"><strong>내 기기 안에만 보관해요.</strong><p>일정·상태·메모와 공식 관광지 표지만 저장합니다. 원본 사진, GPS 좌표, 정확한 출발지와 계정 정보는 여행집에 넣지 않습니다.</p></section>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    {!hydrated ? <section className="travel-book-empty" aria-live="polite"><p>여행집을 펼치는 중이에요.</p></section> : books.length ? <section className="travel-book-list" aria-label="보관한 여행">{books.map((book) => <TravelBookCard key={book.id} book={book} onUpdate={update} onRemove={(id) => { remove(id); setAnnouncement(`${book.title} 여행을 이 기기 여행집에서 삭제했습니다.`); }} onRestore={restore} />)}</section> : <section className="travel-book-empty">
      <span aria-hidden="true">＋</span><p>아직 펼쳐볼 여행이 없어요.</p><h2>먼저 나에게 맞는 여행을 설계해 볼까요?</h2><small>일정에서 ‘여행집에 보관’을 누르면 이곳에 카드가 생깁니다.</small><Link href="/planner">첫 여행 계획하기 <span aria-hidden="true">→</span></Link>
    </section>}
    <footer className="travel-book-footer"><Link href="/planner">새 여행 설계</Link><Link href="/community">여행자 후기 읽기</Link><Link href="/privacy">개인정보</Link><Link href="/terms">이용 안내</Link><GithubFooterLink /></footer>
  </main>;
}
