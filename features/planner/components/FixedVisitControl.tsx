"use client";
import type { FixedVisit } from "../../../lib/trip-time-constraints.js";

export const fixedVisitLabel = (kind: FixedVisit["kind"], en = false) => kind === "stay" ? en ? "Stay" : "숙소" : kind === "event" ? en ? "Reservation / event" : "예약·행사" : en ? "Must-visit" : "꼭 갈 곳";

export default function FixedVisitControl({ name, value, position, onChange, en = false }: {
  name: string; value?: FixedVisit; position: number; en?: boolean; onChange: (value: FixedVisit | null) => void;
}) {
  return <div className="auth-field fixed-visit-control" style={{ width: "100%", minWidth: 0 }}>
    <label>{en ? "Keep this place" : "장소 고정"}<select aria-label={`${name} ${en ? "fixed visit" : "장소 고정"}`} value={value?.kind || ""} onChange={event => onChange(event.target.value ? { kind: event.target.value as FixedVisit["kind"], time: value?.time || "", position: value?.position ?? position } : null)}>
      <option value="">{en ? "Flexible" : "고정 안 함"}</option>{(["visit", "stay", "event"] as const).map(kind => <option value={kind} key={kind}>{fixedVisitLabel(kind, en)}</option>)}
    </select></label>
    {value && <><label>{en ? "Fixed arrival time (optional)" : "도착 시각 고정 (선택)"}<input type="time" aria-label={`${name} ${en ? "fixed arrival time" : "고정 도착 시각"}`} value={value.time} onChange={event => onChange({ ...value, time: event.target.value })} /></label><small>{en ? "The place, date and order stay when recommendations change. This does not make a reservation." : "재추천해도 장소·날짜·순서를 유지해요. 실제 예약은 별도로 진행하세요."}</small></>}
  </div>;
}

export function FixedVisitSummary({ fixed, waiting = 0, late = 0, en = false }: { fixed?: FixedVisit; waiting?: number; late?: number; en?: boolean }) {
  if (!fixed) return null;
  return <p className="modal-note" role={late ? "status" : undefined} style={{ marginBlock: 8 }}>
    <b>{fixedVisitLabel(fixed.kind, en)} {en ? "kept" : "고정"}{fixed.time ? ` · ${fixed.time}` : ""}</b>
    {late > 0 ? en ? ` · ${late} min late. Start earlier or adjust preceding visits.` : ` · 도착 예상 ${late}분 늦음. 하루 시작이나 앞 일정을 조정해 주세요.` : waiting > 0 ? en ? ` · ${waiting} min waiting before the fixed time` : ` · 고정 시각 전 ${waiting}분 여유` : ""}
  </p>;
}
