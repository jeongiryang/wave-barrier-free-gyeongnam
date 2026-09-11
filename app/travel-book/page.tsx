"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import CommunityHeader from "../../components/CommunityHeader";
import SkipLink from "../../components/SkipLink";
import GithubFooterLink from "../../components/GithubFooterLink";
import { buildTravelJournalHref } from "../../lib/community/field-report.js";
import { travelBookRegions, type TravelBook } from "../../lib/travel-book.js";
import { useTravelBook } from "../../features/travel-book/useTravelBook";
import { emptyTrip, readTripValue, replaceCurrentTrip } from "../../lib/current-trip-storage.js";
import { localDate } from "../../features/planner/utils";
import { usePlaceDialogFocus } from "../../features/planner/hooks/usePlaceDialogFocus";
import CloudSaveAction from "../../features/account-travel/CloudSaveAction";
import EditorialPhoto from "../../features/landing/components/EditorialPhoto";
import { horizonPhotos } from "../../features/landing/horizon-photos";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" });

function formatDate(value: string, formatter = dateFormatter) {
  return formatter.format(new Date(`${value}T12:00:00`));
}

function journalHref(book: TravelBook) {
  return buildTravelJournalHref({
    places: book.places.map((place) => ({ id: place.id, name: place.name, day: book.scheduleAssignments[place.id] || book.travelStart })),
    region: book.places[0]?.city || book.region,
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
      <div><small>{book.status === "visited" ? "다녀온 여행" : "다가오는 여행"}</small><strong>{travelBookRegions(book.places).join(" · ") || book.region}</strong></div>
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
            <span>{placeIndex + 1}</span><div><strong>{place.name}</strong><small>{place.address || place.city}</small>{book.visitMinutesByPlaceId?.[place.id] && <small>체류 {book.visitMinutesByPlaceId[place.id]}분</small>}</div><em>방문 전 재확인</em>
          </li>)}</ol>
        </section>)}
      </div>
      <label className="travel-book-note">
        <span>{book.status === "visited" ? "이 여행에서 기억할 점" : "출발 전에 기억할 점"}</span>
        <textarea maxLength={1200} value={note} aria-describedby={`${noteHelpId} ${noteStatusId}`} placeholder={book.status === "visited" ? "현장에서 편했던 동선이나 다음 여행에 참고할 점을 남겨보세요." : "운영시간, 준비물처럼 다시 확인할 내용을 남겨보세요."} onChange={(event) => { setNote(event.currentTarget.value); setNoteState("editing"); }} onBlur={saveNote} />
        <small id={noteHelpId}>입력 후 다른 곳을 누르면 자동 저장돼요.</small>
        <small id={noteStatusId} className="travel-book-note-status" role="status" aria-live="polite">{noteState === "saved" ? "메모를 저장했습니다." : noteState === "editing" ? `편집 중 · ${note.length}/1,200자` : `${note.length}/1,200자`}</small>
      </label>
      <div className="travel-book-actions">
        <button type="button" className="primary" onClick={() => onRestore(book)}>이 일정 다시 열기 <span aria-hidden="true">→</span></button>
        <Link href="/photo-course">사진으로 코스 되살리기</Link>
        <Link href={journalHref(book)}>여행 후기 초안</Link>
      </div>
      <CloudSaveAction book={book} />
      <div className="travel-book-delete">
        <button ref={deleteTriggerRef} type="button" aria-expanded={deleteReady} aria-controls={deletePanelId} onClick={() => deleteReady ? closeDelete() : setDeleteReady(true)}>여행집에서 삭제</button>
        {deleteReady && <div ref={deletePanelRef} id={deletePanelId} className="travel-book-delete-confirm" role="group" aria-label={`${book.title} 삭제 확인`}><span>이 여행을 삭제할까요?</span><button type="button" onClick={() => onRemove(book.id)}>삭제 확인</button><button type="button" onClick={closeDelete}>취소</button></div>}
      </div>
    </div>
  </article>;
}

function NewTripDialog({ onCancel, onConfirm, error }: { onCancel: () => void; onConfirm: () => void; error: string }) {
  const ref = usePlaceDialogFocus(true, onCancel);
  return <dialog ref={ref} className="region-change-dialog" aria-labelledby="new-trip-title" aria-describedby="new-trip-description">
    <h2 id="new-trip-title" tabIndex={-1}>새 여행을 시작할까요?</h2>
    <p id="new-trip-description">현재 편집 중인 일정은 비워집니다. 여행집에 보관한 일정과 메모는 그대로 유지됩니다.</p>
    <div className="travel-book-actions" style={{ gridTemplateColumns: "1fr" }}><button type="button" onClick={onCancel}>기존 일정 유지</button><button type="button" className="primary" onClick={onConfirm}>새 여행 시작</button></div>
    {error && <p role="alert">{error}</p>}
  </dialog>;
}

export default function TravelBookPage() {
  const router = useRouter();
  const { books, hydrated, update, remove, restore } = useTravelBook();
  const [announcement, setAnnouncement] = useState("");
  const [newTripReady, setNewTripReady] = useState(false);
  const [newTripError, setNewTripError] = useState("");
  const closeNewTrip = useCallback(() => { setNewTripReady(false); setNewTripError(""); }, []);
  const visitedCount = books.filter((book) => book.status === "visited").length;

  function startNewTrip() {
    try { replaceCurrentTrip(window.localStorage, emptyTrip("", localDate(), localDate(1))); }
    catch { setNewTripError("새 여행을 저장하지 못했어요. 기존 일정은 유지됩니다. 저장 공간을 확인한 뒤 다시 시도해 주세요."); return; }
    router.push("/planner#conditions");
  }

  function requestNewTrip() {
    setNewTripError("");
    try {
      if (JSON.parse(readTripValue(window.localStorage, "wave-saved-places") || "[]").length) { setNewTripReady(true); return; }
    } catch { setNewTripError("현재 일정을 확인하지 못했어요. 페이지를 새로 열어 다시 시도해 주세요."); return; }
    startNewTrip();
  }

  return <main className="travel-book-page">
    <SkipLink href="#travel-book-main">여행집 본문으로 바로가기</SkipLink>
    <CommunityHeader current="travel-book" />
    <section className="travel-book-hero" id="travel-book-main">
      <div className="travel-book-hero-copy"><p>나의 경남, 이어지는 여행</p><h1>다녀온 풍경이,<br /><em>다음 여행이 되도록.</em></h1><span>기다리는 여행과 오래 기억할 하루.<br />나의 속도로 한 장씩 모아보세요.</span><a href="#travel-book-collection">나의 여행 펼쳐보기 <span aria-hidden="true">↓</span></a></div>
      <div className="travel-book-landscapes"><EditorialPhoto photo={horizonPhotos.park} /><EditorialPhoto photo={horizonPhotos.garden} /></div>
      <dl aria-label="여행집 요약"><div><dt>보관한 여행</dt><dd>{hydrated ? books.length : "—"}</dd></div><div><dt>다녀온 여행</dt><dd>{hydrated ? visitedCount : "—"}</dd></div><div><dt>갈 여행</dt><dd>{hydrated ? books.length - visitedCount : "—"}</dd></div></dl>
    </section>
    <section className="travel-book-paths" aria-label="여행을 이어가는 방법"><Link href="/planner"><small>01 · 계획</small><strong>다음 풍경 고르기 <span aria-hidden="true">↗</span></strong><p>지역과 필요한 편의부터, 나에게 맞는 하루를.</p></Link><Link href="/photo-course"><small>02 · 기록</small><strong>사진으로 다시 걷기 <span aria-hidden="true">↗</span></strong><p>사진 속 장소를 찾아 여행의 순서를 이어가요.</p></Link><Link href="/my-trips"><small>03 · 함께</small><strong>계정 여행 이어가기 <span aria-hidden="true">↗</span></strong><p>계정에 저장한 일정을 열고 동행자와 함께해요.</p></Link></section>
    <div className="travel-book-collection-heading" id="travel-book-collection"><p>MY COLLECTION</p><h2>나의 여행 모음</h2></div>
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    {!hydrated ? <section className="travel-book-empty" aria-live="polite"><p>여행집을 펼치는 중이에요.</p></section> : books.length ? <section className="travel-book-list" aria-label="보관한 여행">{books.map((book) => <TravelBookCard key={book.id} book={book} onUpdate={update} onRemove={(id) => { remove(id); setAnnouncement(`${book.title} 여행을 여행집에서 삭제했습니다.`); }} onRestore={restore} />)}</section> : <section className="travel-book-empty">
      <span aria-hidden="true">＋</span><p>아직 펼쳐볼 여행이 없어요.</p><h2>먼저 나에게 맞는 여행을 설계해 볼까요?</h2><small>일정에서 ‘여행집에 보관’을 누르면 이곳에 카드가 생깁니다.</small><Link href="/planner">첫 여행 계획하기 <span aria-hidden="true">→</span></Link>
    </section>}
    <footer className="travel-book-footer"><button type="button" disabled={!hydrated} onClick={requestNewTrip}>새 여행 설계</button><Link href="/community">여행자 후기 읽기</Link><Link href="/privacy">개인정보</Link><Link href="/terms">이용 안내</Link><GithubFooterLink /></footer>
    {!newTripReady && newTripError && <p role="alert">{newTripError}</p>}
    {newTripReady && <NewTripDialog onCancel={closeNewTrip} onConfirm={startNewTrip} error={newTripError} />}
  </main>;
}
