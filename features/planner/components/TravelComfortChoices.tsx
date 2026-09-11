"use client";
import { useRef, useState } from "react";
import { combineCompanionNeeds, sanitizeComfort, type TripComfort } from "../../../lib/trip-comfort.js";
import { profiles } from "../constants";
import { englishProfiles } from "../condition-copy";

const walkingOptions = [5, 10, 15, 20, 30, 45, 60, 90, 120, 240];
const optionsWith = (values: number[], current: number | null) => [...new Set([...values, ...(current === null ? [] : [current])])].sort((a, b) => a - b);
type Member = { id: number; profiles: string[]; maxWalkMinutes: number | null };

export default function TravelComfortChoices({ selected, comfort, onSelected, onComfort, en = false }: {
  selected: string[]; comfort: TripComfort; onSelected: (value: string[]) => void; onComfort: (value: TripComfort) => void; en?: boolean;
}) {
  const details = useRef<HTMLDetailsElement>(null), nextMember = useRef(2);
  const [draft, setDraft] = useState(comfort), [notice, setNotice] = useState("");
  const [members, setMembers] = useState<Member[]>([{ id: 1, profiles: [], maxWalkMinutes: null }]);
  const say = (ko: string, english: string) => en ? english : ko;
  function close() { if (details.current) { details.current.open = false; details.current.querySelector("summary")?.focus(); } }
  function changeMember(id: number, value: Partial<Member>) { setMembers(current => current.map(member => member.id === id ? { ...member, ...value } : member)); }
  return <details className="travel-profile-card trip-comfort-choices" ref={details}>
    <summary onClick={() => { if (!details.current?.open) setDraft(comfort); }}><span><small>{say("함께, 편안한 속도로", "A comfortable pace together")}</small><strong>{say("걷기·휴식과 동행 조건", "Walking, rests and companions")}</strong></span><b aria-hidden="true">+</b></summary>
    <div className="travel-profile-content" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setDraft(comfort); close(); } }}>
      <p>{say("연속해서 걸을 시간과 쉬어 갈 간격을 직접 정하세요. 일정에서 확인된 걷기 구간과 비교하고 휴식을 넣을 수 있어요.", "Choose your walking limit and rest interval. Compare reported walking legs and add rests in the itinerary.")}</p>
      <div className="auth-field"><label>{say("연속 걷기 기준", "Continuous walking limit")}<select value={draft.maxWalkMinutes ?? ""} onChange={event => setDraft({ ...draft, maxWalkMinutes: event.target.value ? Number(event.target.value) : null })}><option value="">{say("정하지 않음", "No limit set")}</option>{optionsWith(walkingOptions, draft.maxWalkMinutes).map(minutes => <option key={minutes} value={minutes}>{minutes}{say("분", " min")}</option>)}</select></label></div>
      <div className="auth-field"><label>{say("쉬어 갈 간격", "Rest interval")}<select value={draft.breakEveryMinutes ?? ""} onChange={event => setDraft({ ...draft, breakEveryMinutes: event.target.value ? Number(event.target.value) : null })}><option value="">{say("필요할 때 직접 추가", "Add rests as needed")}</option>{optionsWith([30, 60, 90, 120, 180, 240, 360], draft.breakEveryMinutes).map(minutes => <option key={minutes} value={minutes}>{say(`약 ${minutes}분마다`, `About every ${minutes} min`)}</option>)}</select></label></div>
      <div className="auth-field"><label>{say("한 번에 쉬는 시간", "Length of each rest")}<select value={draft.breakMinutes} onChange={event => setDraft({ ...draft, breakMinutes: Number(event.target.value) })}>{optionsWith([5, 10, 15, 20, 30, 60, 120], draft.breakMinutes).map(minutes => <option key={minutes} value={minutes}>{minutes}{say("분", " min")}</option>)}</select></label></div>
      <div className="travel-profile-actions"><button type="button" onClick={() => { onComfort(sanitizeComfort(draft)); setNotice(say("걷기·휴식 기준을 적용했어요. 일정에서 휴식을 추가해 주세요.", "Preferences applied. Add the proposed rests in your itinerary.")); }}>{say("이 기준 적용", "Apply preferences")}</button><button type="button" onClick={() => { setDraft(comfort); close(); }}>{say("취소", "Cancel")}</button></div>
      <details className="place-evidence"><summary>{say("동행자 조건 함께 모으기", "Combine companion needs")}</summary><div className="modal-data">
        <p>{say("함께 가는 분이 원하는 편의를 각자 골라주세요. 이름을 입력하지 않아도 필요한 조건을 모을 수 있어요.", "Each companion can choose the facilities they need. Names are not needed.")}</p>
        {members.map((member, index) => <fieldset key={member.id} style={{ minWidth: 0, border: "1px solid var(--line)", borderRadius: 12, padding: 12, marginBlock: 12 }}>
          <legend>{say(`동행 ${index + 1}`, `Companion ${index + 1}`)}</legend>
          <div className="travel-profile-actions" role="group" aria-label={say(`동행 ${index + 1} 편의`, `Companion ${index + 1} facilities`)}>{profiles.map(profile => <button type="button" key={profile.id} aria-pressed={member.profiles.includes(profile.id)} onClick={() => changeMember(member.id, { profiles: member.profiles.includes(profile.id) ? member.profiles.filter(id => id !== profile.id) : [...member.profiles, profile.id] })}>{member.profiles.includes(profile.id) ? "✓ " : ""}{en ? englishProfiles[profile.id].label : profile.label}</button>)}</div>
          <div className="auth-field"><label>{say(`동행 ${index + 1} 연속 걷기`, `Companion ${index + 1} walking limit`)}<select value={member.maxWalkMinutes ?? ""} onChange={event => changeMember(member.id, { maxWalkMinutes: event.target.value ? Number(event.target.value) : null })}><option value="">{say("정하지 않음", "No limit set")}</option>{walkingOptions.map(minutes => <option key={minutes} value={minutes}>{minutes}{say("분", " min")}</option>)}</select></label></div>
          <div className="travel-profile-actions"><button type="button" disabled={members.length === 1} onClick={() => setMembers(current => current.filter(item => item.id !== member.id))}>{say(`동행 ${index + 1} 입력 지우기`, `Remove companion ${index + 1}`)}</button></div>
        </fieldset>)}
        <div className="travel-profile-actions"><button type="button" disabled={members.length >= 8} onClick={() => { const id = nextMember.current++; setMembers(current => [...current, { id, profiles: [], maxWalkMinutes: null }]); }}>{say("동행자 추가", "Add companion")}</button><button type="button" onClick={() => { const result = combineCompanionNeeds(members, selected, draft); onSelected(result.selected); onComfort(result.comfort); setDraft(result.comfort); setNotice(say(`편의 ${result.selected.length}개${result.comfort.maxWalkMinutes ? ` · 연속 걷기 ${result.comfort.maxWalkMinutes}분` : ""}을 함께 적용했어요.`, "Combined facilities and walking limit applied.")); }}>{say("함께 필요한 조건 적용", "Apply combined needs")}</button></div>
        <p className="modal-note">{say("기존에 고른 편의는 유지하고 모두에게 필요한 조건을 더합니다. 걷기는 고른 값 중 가장 짧은 시간에 맞춰요. 바꾸려면 위 편의 선택과 걷기 기준에서 직접 조정하세요.", "Existing choices are kept and combined with everyone's needs. The shortest selected walking limit is used; you can adjust the combined choices above.")}</p>
      </div></details>
      <p role="status">{notice}</p>
    </div>
  </details>;
}
