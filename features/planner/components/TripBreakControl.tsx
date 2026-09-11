"use client";
import type { StopPurpose } from "../../../lib/trip-comfort.js";
const times = [5, 10, 15, 20, 30, 60, 90, 120];
export default function TripBreakControl({ name, value, purpose, onChange, onPurpose, en = false }: {
  name: string; value?: number; purpose?: StopPurpose; onChange: (minutes: number | null) => void; onPurpose?: (value: StopPurpose | null) => void; en?: boolean;
}) {
  const say = (ko: string, english: string) => en ? english : ko;
  return <div className="auth-field trip-break-control" style={{ width: "100%", minWidth: 0 }}>
    <label>{say("방문 뒤 쉬는 시간", "Rest after this visit")}<select aria-label={say(`${name} 방문 뒤 휴식`, `${name} rest after visit`)} value={value ?? ""} onChange={event => onChange(event.target.value ? Number(event.target.value) : null)}><option value="">{say("추가하지 않음", "No extra rest")}</option>{[...new Set([...times, ...(value ? [value] : [])])].sort((a, b) => a - b).map(minutes => <option key={minutes} value={minutes}>{minutes}{say("분", " min")}</option>)}</select></label>
    {onPurpose && <label>{say("이곳에 들르는 이유", "Purpose of this stop")}<select aria-label={say(`${name} 방문 목적`, `${name} stop purpose`)} value={purpose ?? ""} onChange={event => onPurpose(event.target.value ? event.target.value as StopPurpose : null)}><option value="">{say("둘러보기", "Visit")}</option><option value="rest">{say("쉬어 가기", "Rest stop")}</option><option value="restroom">{say("화장실 이용", "Restroom stop")}</option></select></label>}
    {(value || purpose) && <small>{say("쉬는 공간과 화장실 운영은 이용 정보에서 확인해 주세요.", "Check the venue's rest facilities and restroom availability.")}</small>}
  </div>;
}

export function TripBreakSummary({ minutes, purpose, start, end, en = false, inheritColor = false }: { minutes?: number; purpose?: StopPurpose; start?: string; end?: string; en?: boolean; inheritColor?: boolean }) {
  if (!minutes && !purpose) return null;
  return <p className="modal-note" style={{ marginBlock: 8, color: inheritColor ? "inherit" : undefined }}>{purpose && <b>{purpose === "restroom" ? en ? "Restroom stop" : "화장실 이용" : en ? "Rest stop" : "쉬어 가는 곳"} · </b>}{minutes ? <>{en ? `Rest ${minutes} min after visiting` : `방문 뒤 ${minutes}분 휴식`}{start && end ? ` · ${start}–${end}` : ""}</> : en ? "Check facilities before visiting" : "방문 전 시설 확인"}</p>;
}
