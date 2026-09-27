"use client";

import { useRef, useState } from "react";
import { FACILITIES } from "../../../lib/facility-selection.js";
import { profiles } from "../constants";

type Member = { id: number; profiles: string[] };

export default function TravelComfortChoices({ selected, onSelected, en = false }: {
  selected: string[]; onSelected: (value: string[]) => void; en?: boolean;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const nextMember = useRef(2);
  const [members, setMembers] = useState<Member[]>([{ id: 1, profiles: [] }]);
  const [notice, setNotice] = useState("");
  const say = (ko: string, english: string) => en ? english : ko;
  const close = () => {
    if (!details.current) return;
    details.current.open = false;
    details.current.querySelector("summary")?.focus();
  };
  const changeMember = (id: number, profiles: string[]) => setMembers(current => current.map(member => member.id === id ? { ...member, profiles } : member));
  const combine = () => {
    const combined = [...new Set([...selected, ...members.flatMap(member => member.profiles)])];
    onSelected(combined);
    setNotice(say(`동행자에게 필요한 편의 ${combined.length}개를 선택했어요. 아래 적용을 누르면 반영돼요.`, `Selected ${combined.length} facilities needed by your companions. Choose Apply below to continue.`));
  };

  return <details className="travel-profile-card trip-comfort-choices" ref={details}>
    <summary><span>{say("동행 조건", "Companion needs")}</span><b aria-hidden="true">+</b></summary>
    <div className="travel-profile-content" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }}>
      <p>{say("함께 가는 분에게 필요한 편의를 골라 한 번에 합칠 수 있어요. 이름이나 건강 정보는 입력하지 않아요.", "Combine the facilities each companion needs without entering names or health information.")}</p>
      {members.map((member, index) => <fieldset key={member.id} className="companion-needs-group">
        <legend>{say(`동행 ${index + 1}`, `Companion ${index + 1}`)}</legend>
        <div className="travel-profile-actions" role="group" aria-label={say(`동행 ${index + 1} 편의`, `Companion ${index + 1} facilities`)}>
          {profiles.map(profile => {
            const active = member.profiles.includes(profile.id);
            const label = en ? FACILITIES.find(item => item.key === profile.id)?.en || profile.label : profile.label;
            return <button type="button" key={profile.id} aria-pressed={active} onClick={() => changeMember(member.id, active ? member.profiles.filter(id => id !== profile.id) : [...member.profiles, profile.id])}>{active ? "✓ " : ""}{label}</button>;
          })}
        </div>
        <button type="button" disabled={members.length === 1} onClick={() => setMembers(current => current.filter(item => item.id !== member.id))}>{say(`동행 ${index + 1} 지우기`, `Remove companion ${index + 1}`)}</button>
      </fieldset>)}
      <div className="travel-profile-actions">
        <button type="button" disabled={members.length >= 8} onClick={() => { const id = nextMember.current++; setMembers(current => [...current, { id, profiles: [] }]); }}>{say("동행자 추가", "Add companion")}</button>
        <button type="button" onClick={combine}>{say("동행 조건 합치기", "Combine needs")}</button>
        <button type="button" onClick={close}>{say("닫기", "Close")}</button>
      </div>
      <p className="modal-note">{say("이미 고른 편의는 유지하고 동행자에게 필요한 항목을 더합니다.", "Existing choices are kept and companion needs are added.")}</p>
      <p role="status">{notice}</p>
    </div>
  </details>;
}
