"use client";
import { useRef, useState } from "react";
import { assessDayDeadline, validTripClock, type DayDeadline } from "../../../lib/trip-time-constraints.js";
import { formatScheduleTime } from "../optimization/itinerary-schedule.js";

type Entry = { endsAt: number; travelSource: string };
export function DayDeadlineSummary({ entries, value, en = false }: { entries: Entry[]; value?: DayDeadline; en?: boolean }) {
  const result = assessDayDeadline(entries, value);
  if (!value) return null;
  return <div className="reference-tint day-deadline-summary" role="status" style={{ marginBlock: 12 }}>
    <strong>{en ? "Return / appointment" : "귀가·약속 마감"} {value.time}</strong>
    {!result ? <p>{en ? "Add places to compare the end of this day." : "장소를 담으면 이 날의 예상 종료와 비교해요."}</p> : <>
      <p>{result.state === "over" ? en ? `${Math.abs(result.remainingMinutes)} min over${result.returnKnown ? "" : " or more"}` : `${result.returnKnown ? "" : "최소 "}${Math.abs(result.remainingMinutes)}분 초과 예상` : result.state === "within" ? en ? `${result.remainingMinutes} min remaining in this plan` : `계획상 ${result.remainingMinutes}분 여유` : en ? "Return travel time needs confirmation" : "귀가 이동시간 확인 필요"}</p>
      <small>{en ? "Last visit ends" : "마지막 방문 종료"} {formatScheduleTime(entries.at(-1)!.endsAt)} · {value.returnMinutes === null ? en ? "return travel unknown" : "귀가 이동 미입력" : en ? `return travel ${value.returnMinutes} min (your estimate)` : `귀가 이동 ${value.returnMinutes}분 (직접 입력)`} · {en ? "buffer" : "여유"} {value.bufferMinutes}{en ? " min" : "분"}</small>
      {result.returnKnown && <p>{en ? "Arrival with buffer" : "여유시간 포함 예상 도착"} {formatScheduleTime(result.projectedEnd)}</p>}
      <p className="modal-note" style={{ color: "inherit" }}>{en ? "An estimate for your plan. " : "일정의 예상 시간으로 비교해요. "}{!result.allLegsVerified ? en ? "Some travel legs are unverified. " : "확인하지 않은 이동 구간이 있어요. " : ""}{en ? "Allow for service changes and waiting." : "교통편 변동과 대기시간도 고려해 주세요."}</p>
    </>}
  </div>;
}

export default function DayDeadlineControl({ day, value, entries, onChange, en = false }: {
  day: string; value?: DayDeadline; entries: Entry[]; en?: boolean; onChange: (value: DayDeadline | null) => void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const [time, setTime] = useState(value?.time || "");
  const [returnMinutes, setReturnMinutes] = useState(value?.returnMinutes?.toString() ?? "");
  const [buffer, setBuffer] = useState(String(value?.bufferMinutes ?? 15));
  const [invalid, setInvalid] = useState(false);
  const [notice, setNotice] = useState("");
  function close() { if (details.current) { details.current.open = false; details.current.querySelector("summary")?.focus(); } }
  function reset() { setTime(value?.time || ""); setReturnMinutes(value?.returnMinutes?.toString() ?? ""); setBuffer(String(value?.bufferMinutes ?? 15)); setInvalid(false); }
  function apply() {
    const minutes = returnMinutes === "" ? null : /^\d{1,3}$/.test(returnMinutes) ? Number(returnMinutes) : -1;
    if (!validTripClock(time) || minutes !== null && (minutes < 0 || minutes > 720)) { setInvalid(true); return; }
    onChange({ time, returnMinutes: minutes, bufferMinutes: Number(buffer) }); setInvalid(false); setNotice(en ? "Time saved." : "마감시간을 적용했어요."); close();
  }
  return <div className="day-deadline" style={{ width: "100%", minWidth: 0 }}>
    <details ref={details} className="place-evidence">
      <summary onClick={() => { if (!details.current?.open) reset(); }} aria-label={`${day} ${en ? "return deadline" : "귀가·약속 시간"}`}>{en ? "Return / appointment time" : "귀가·약속 시간"}{value ? ` · ${value.time}` : ""}</summary>
      <div className="modal-data" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); reset(); close(); } else if (event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); apply(); } }}>
        <p>{en ? "Set the time you need to arrive after the last visit." : "마지막 장소를 둘러본 뒤 도착해야 할 시각을 정해요."}</p>
        <div className="auth-field"><label>{en ? "Arrive by" : "도착 마감 시각"}<input type="time" value={time} aria-invalid={invalid && !validTripClock(time) || undefined} onChange={event => setTime(event.target.value)} /></label></div>
        <div className="auth-field"><label>{en ? "Return travel (minutes, optional)" : "마지막 장소부터 이동 (분, 선택)"}<input type="number" inputMode="numeric" min={0} max={720} step={1} value={returnMinutes} aria-invalid={invalid && returnMinutes !== "" && (!/^\d{1,3}$/.test(returnMinutes) || Number(returnMinutes) > 720) || undefined} placeholder={en ? "Unknown" : "모르면 비워두세요"} onChange={event => setReturnMinutes(event.target.value)} /></label></div>
        <div className="auth-field"><label>{en ? "Extra buffer" : "추가 여유시간"}<select value={buffer} onChange={event => setBuffer(event.target.value)}>{[...new Set([0, 15, 30, 60, 90, 120, value?.bufferMinutes ?? 15])].sort((a, b) => a - b).map(minutes => <option key={minutes} value={minutes}>{minutes}{en ? " min" : "분"}</option>)}</select></label></div>
        {invalid && <p role="alert">{en ? "Choose a time and enter 0–720 whole minutes, or leave travel blank." : "시각과 이동시간을 확인해 주세요. 이동은 0~720분 정수 또는 빈칸으로 입력해요."}</p>}
        <div className="travel-book-actions"><button type="button" onClick={apply}>{en ? "Apply" : "적용"}</button><button type="button" onClick={() => { reset(); close(); }}>{en ? "Cancel" : "취소"}</button>{value && <button type="button" onClick={() => { onChange(null); setNotice(en ? "Deadline removed." : "마감시간을 해제했어요."); close(); }}>{en ? "Remove deadline" : "마감 해제"}</button>}</div>
      </div>
    </details>
    <DayDeadlineSummary entries={entries} value={value} en={en} />
    {notice && <p className="modal-note" role="status">{notice}</p>}
  </div>;
}
