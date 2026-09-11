"use client";
import { useId, useRef, useState } from "react";
import { MAX_VISIT_MINUTES, MIN_VISIT_MINUTES, validVisitMinutes } from "../../../lib/visit-durations.js";

const presets = [30, 60, 90, 120, 180];
export default function VisitDurationControl({ name, value, defaultMinutes = 90, en = false, onChange }: {
  name: string; value?: number; defaultMinutes?: number; en?: boolean; onChange: (value: number | null) => void;
}) {
  const id = useId();
  const select = useRef<HTMLSelectElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const custom = value !== undefined && !presets.includes(value);
  const valid = validVisitMinutes(Number(draft)) && draft.trim() !== "";
  const c = (ko: string, english: string) => en ? english : ko;
  function closeEditor() { setEditing(false); window.requestAnimationFrame(() => select.current?.focus()); }
  function apply() { if (valid) { onChange(Number(draft)); closeEditor(); } }
  return <div className="auth-field">
    <label htmlFor={id}>{c("머무는 시간", "Visit duration")}</label>
    <select ref={select} id={id} aria-label={c(`${name} 머무는 시간`, `${name} visit duration`)} value={editing ? "custom" : value === undefined ? "default" : custom ? "saved" : String(value)} onChange={event => {
      if (event.target.value === "custom") { setDraft(String(value ?? defaultMinutes)); setEditing(true); window.requestAnimationFrame(() => { input.current?.focus(); input.current?.select(); }); }
      else { setEditing(false); if (event.target.value !== "saved") onChange(event.target.value === "default" ? null : Number(event.target.value)); }
    }}>
      <option value="default">{c(`기본 · 약 ${defaultMinutes}분`, `Default · about ${defaultMinutes} min`)}</option>
      {presets.map(minutes => <option key={minutes} value={minutes}>{c(`${minutes}분`, `${minutes} min`)}</option>)}
      {custom && <option value="saved">{c(`${value}분 · 직접 설정`, `${value} min · your choice`)}</option>}
      <option value="custom">{c("직접 입력", "Enter minutes")}</option>
    </select>
    {editing && <div className="auth-field">
      <label htmlFor={`${id}-custom`}>{c("체류시간(분)", "Duration in minutes")}</label>
      <input ref={input} id={`${id}-custom`} type="number" min={MIN_VISIT_MINUTES} max={MAX_VISIT_MINUTES} step={1} inputMode="numeric" value={draft} aria-invalid={!valid} aria-describedby={`${id}-hint`} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); apply(); } if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeEditor(); } }} />
      <small id={`${id}-hint`}>{c("15~720분 사이로 입력해 주세요.", "Enter 15–720 whole minutes.")}</small>
      <div className="travel-book-actions"><button type="button" disabled={!valid} onClick={apply}>{c("시간 적용", "Apply duration")}</button><button type="button" onClick={closeEditor}>{c("취소", "Cancel")}</button></div>
    </div>}
  </div>;
}
