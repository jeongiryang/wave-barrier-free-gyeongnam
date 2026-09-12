"use client";
import { useEffect, useRef, useState } from "react";
import { assessVisitHours, type PlannedVisit, type VisitInfo } from "../../../lib/visit-hours.js";
import { formatScheduleTime } from "../optimization/itinerary-schedule.js";
import { fetchVisitInfo } from "../services/visit-info";

const reasons: Record<string, [string, string]> = {
  "within-hours": ["등록된 이용시간 안에 머무는 일정이에요.", "Your planned visit fits the published hours."],
  "before-opening": ["예상 도착이 개장 전이에요. 하루 시작이나 앞 일정을 조정해 보세요.", "You would arrive before opening. Adjust your start or earlier stops."],
  "after-closing": ["예상 도착이 마감 이후예요. 순서를 앞당기거나 다른 장소를 골라보세요.", "You would arrive after closing. Visit earlier or choose another place."],
  "after-admission": ["예상 도착이 입장 마감 이후예요. 방문 순서를 앞당겨 보세요.", "You would arrive after last admission. Move this visit earlier."],
  "visit-overrun": ["머무는 동안 이용시간이 끝나요. 체류시간이나 앞 일정을 조정해 보세요.", "Your visit extends past closing. Adjust its duration or earlier stops."],
  "closed-day": ["등록된 정기 휴무일과 겹쳐요. 방문 날짜나 장소를 바꿔보세요.", "This date falls on a published closing day. Change the date or place."],
  "outside-event": ["등록된 행사 기간 밖의 일정이에요. 행사 날짜를 확인해 주세요.", "This visit is outside the published event dates."],
  "confirm-hours": ["이용시간이 없거나 조건에 따라 달라요. 아래 정보와 시설 안내를 확인해 주세요.", "Hours are missing or conditional. Check the details and ask the venue."],
  "confirm-holiday": ["시간대는 맞지만 휴무 여부는 확인이 필요해요.", "The times fit, but closing days still need confirmation."],
  "confirm-date": ["날짜가 없거나 자정을 넘는 일정이에요. 실제 방문일의 운영을 확인해 주세요.", "Check the actual visit date, including any travel past midnight."],
};

export default function VisitHoursCard({ id, name, visit, en = false }: { id: string; name: string; visit?: PlannedVisit; en?: boolean }) {
  const [info, setInfo] = useState<VisitInfo | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const c = (ko: string, english: string) => en ? english : ko;
  async function load() {
    if (state === "loading") return;
    setState("loading");
    try { const next = await fetchVisitInfo(id); if (mounted.current) { setInfo(next); setState("ready"); } }
    catch { if (mounted.current) setState("error"); }
  }
  const assessment = visit && info ? assessVisitHours(info, visit) : null;
  return <details className="place-evidence visit-hours" style={{ margin: "12px 0", width: "100%", minWidth: 0 }} onToggle={event => { if (event.currentTarget.open) void load(); }}>
    <summary aria-label={c(`${name} 이용시간 확인`, `${name} visiting hours`)}>{c("이용시간 확인", "Visiting hours")}</summary>
    <div className="modal-data" style={{ overflowWrap: "anywhere", fontSize: 14, lineHeight: 1.65 }} aria-busy={state === "loading"}>
      {state === "loading" && <p className="wave-loading-inline" role="status">{c("공식 이용 정보를 불러오고 있어요…", "Loading official visitor information…")}</p>}
      {state === "error" && <><p role="alert">{c("이용 정보를 불러오지 못했어요.", "Visitor information couldn't load.")}</p><div className="travel-book-actions"><button type="button" onClick={() => void load()}>{c("다시 확인", "Try again")}</button></div></>}
      {info && state === "ready" && <>
        {visit && <p className="modal-note">{visit.day} · {c("예상 방문", "Planned visit")} {formatScheduleTime(visit.startsAt)}–{formatScheduleTime(visit.endsAt)}</p>}
        {assessment && <p role="status" data-state={assessment.state}><b style={{ display: "block", color: assessment.state === "conflict" ? "var(--ink)" : "var(--blue)" }}>{assessment.state === "within" ? c("시간대 일치", "Times fit") : assessment.state === "conflict" ? c("일정 조정 필요", "Adjust your visit") : c("확인 필요", "Check with venue")}</b>{(reasons[assessment.reason] || reasons["confirm-hours"])[en ? 1 : 0]}</p>}
        {info.status === "available" ? <>
          <span><small>{c("이용시간", "Hours")}</small>{info.hours || c("등록된 시간 없음", "No published hours")}</span>
          <span><small>{c("휴무", "Closed days")}</small>{info.restDays || c("등록된 휴무 정보 없음", "No published closing days")}</span>
          {(info.eventStart || info.eventEnd) && <span><small>{c("행사 기간", "Event dates")}</small>{info.eventStart || "—"} – {info.eventEnd || "—"}</span>}
          {info.checkIn && <span><small>{c("체크인", "Check-in")}</small>{info.checkIn}</span>}
          {info.checkOut && <span><small>{c("체크아웃", "Check-out")}</small>{info.checkOut}</span>}
          {info.fees && <span><small>{c("이용요금", "Admission fees")}</small>{info.fees}</span>}
          {info.phone && <span><small>{c("문의", "Contact")}</small>{/^[0-9+()\s-]{7,30}$/.test(info.phone) ? <a style={{ display: "inline-flex", alignItems: "center", minHeight: 44 }} href={`tel:${info.phone.replace(/[^+\d]/g, "")}`}>{info.phone}</a> : info.phone}</span>}
        </> : <p>{c("이 장소의 공식 이용 정보를 확인하지 못했어요. 시설에 운영시간과 휴무를 문의해 주세요.", "Official visiting information is unavailable. Ask the venue about hours and closing days.")}</p>}
        <p className="modal-note">{visit ? c("등록 정보와 예상 일정의 비교예요. ", "This compares published information with planned times. ") : c("한국관광공사에 등록된 이용 정보예요. ", "Visitor information published by the Korea Tourism Organization. ")}{c("당일 변경·예약 가능 여부는 시설에 확인해 주세요.", "Confirm same-day changes and reservations with the venue.")}</p>
        <p className="modal-note">{info.source} · {c("정보 조회", "Retrieved")} {new Date(info.checkedAt).toLocaleString(en ? "en-GB" : "ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} KST</p>
      </>}
    </div>
  </details>;
}
