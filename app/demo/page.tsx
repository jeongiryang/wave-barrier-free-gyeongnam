"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import NightIcon from '../../components/NightIcon';
import { useSitePreferences } from '../../components/SitePreferences';
import WaveHeader from '../../components/WaveHeader';
import SiteFooter from '../../components/SiteFooter';
import DemoStories from '../../features/demo/DemoStories';
import { buildDemoSchedule, demoScenarios, formatDemoTime, type DemoStop } from '../../features/demo/schedule';
import '../../features/demo/demo.css';

const storageKey = 'wave-demo-plan-v1';
const checks = ['방문지 편의시설을 실제 정보에서 확인하기', '운영시간과 휴무를 다시 확인하기', '이동 경로와 소요시간을 조회하기', '필요한 질문을 현장에 문의하기'];
const questions = ['계단 없는 출입구가 있나요?', '이용 가능한 화장실이 있나요?', '승강기를 현재 이용할 수 있나요?', '주차장에서 입구까지 어떻게 이동하나요?'];
type Snapshot = { index: number; stops: DemoStop[]; startTime: string; checked: boolean[] };

function readSaved(value: unknown): Snapshot | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<Snapshot>;
  if (!Number.isInteger(data.index) || (data.index ?? -1) < 0 || (data.index ?? 99) >= demoScenarios.length) return null;
  const index = data.index as number, base = demoScenarios[index];
  if (!Array.isArray(data.stops) || data.stops.length !== base.stops.length) return null;
  const stops = data.stops.map((stop) => {
    const original = base.stops.find((item) => item.id === stop?.id);
    if (!original || !Number.isInteger(stop.day) || stop.day < 0 || stop.day >= base.days.length
      || !Number.isInteger(stop.visitMinutes) || stop.visitMinutes < 15 || stop.visitMinutes > 240
      || !Number.isInteger(stop.breakMinutes) || stop.breakMinutes < 0 || stop.breakMinutes > 120) return null;
    return { ...original, day: stop.day, visitMinutes: stop.visitMinutes, breakMinutes: stop.breakMinutes };
  });
  if (stops.some((stop) => !stop) || new Set(data.stops.map((stop) => stop.id)).size !== base.stops.length) return null;
  return { index, stops: stops as DemoStop[], startTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(data.startTime || '') ? data.startTime as string : base.startTime, checked: checks.map((_, i) => data.checked?.[i] === true) };
}

export default function DemoPage() {
  const { hydrated } = useSitePreferences();
  const [index, setIndex] = useState(0);
  const [stops, setStops] = useState<DemoStop[]>(demoScenarios[0].stops.map((stop) => ({ ...stop })));
  const [startTime, setStartTime] = useState(demoScenarios[0].startTime);
  const [checked, setChecked] = useState(checks.map(() => false));
  const [previous, setPrevious] = useState<{ stops: DemoStop[]; startTime: string } | null>(null);
  const [pending, setPending] = useState<'rest' | 'visit' | null>(null);
  const [question, setQuestion] = useState(0);
  const [notice, setNotice] = useState('');
  const scenario = demoScenarios[index], schedule = buildDemoSchedule(stops, scenario.days, startTime);

  function select(next: number) {
    setIndex(next); setStops(demoScenarios[next].stops.map((stop) => ({ ...stop })));
    setStartTime(demoScenarios[next].startTime); setChecked(checks.map(() => false));
    setPrevious(null); setPending(null); setNotice('다른 시연 일정을 열었습니다.');
  }
  function update(next: DemoStop[], time = startTime) {
    setPrevious({ stops, startTime }); setStops(next); setStartTime(time); setPending(null);
    setNotice('시연 일정에 반영했습니다. 실제 여행은 변경되지 않았습니다.');
  }
  function change(id: string, value: Partial<DemoStop>) { update(stops.map((stop) => stop.id === id ? { ...stop, ...value } : stop)); }
  function move(id: string, direction: -1 | 1) {
    const from = stops.findIndex((stop) => stop.id === id);
    const sameDay = stops.map((stop, i) => stop.day === stops[from].day ? i : -1).filter((i) => i >= 0);
    const to = sameDay[sameDay.indexOf(from) + direction];
    if (to === undefined) return;
    const next = [...stops]; [next[from], next[to]] = [next[to], next[from]]; update(next);
  }
  function apply() {
    if (!pending) return;
    update(stops.map((stop) => stop.id === stops[0].id
      ? { ...stop, breakMinutes: pending === 'rest' ? 20 : stop.breakMinutes, visitMinutes: pending === 'visit' ? 90 : stop.visitMinutes }
      : stop));
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ index, stops, startTime, checked } satisfies Snapshot)); setNotice('시연 일정을 이 브라우저에 저장했습니다. 실제 여행집이나 계정에는 저장되지 않습니다.'); }
    catch { setNotice('브라우저 저장을 사용할 수 없습니다. 시연 일정은 화면에 남아 있습니다.'); }
  }
  function restore() {
    try {
      const raw = localStorage.getItem(storageKey), saved = raw ? readSaved(JSON.parse(raw)) : null;
      if (!saved) { setNotice('복원할 시연 일정이 없습니다.'); return; }
      setIndex(saved.index); setStops(saved.stops); setStartTime(saved.startTime); setChecked(saved.checked);
      setPrevious(null); setPending(null); setNotice('저장한 시연 일정을 불러왔습니다.');
    } catch { setNotice('저장한 시연 일정을 읽지 못했습니다.'); }
  }
  function download() {
    const payload = { kind: 'WAVE_DEMO_ONLY', note: '장소·시설·날씨·경로가 없는 시연 일정', scenario: scenario.title, startTime, days: schedule };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'wave-demo-plan.json'; link.click(); URL.revokeObjectURL(url);
    setNotice('시연 일정을 파일로 저장했습니다. 공개 공유 링크는 생성하지 않았습니다.');
  }

  return <div className="wave-night night-secondary night-demo"><WaveHeader current="planner" /><main className="demo-page" id="demo-main">
    <header><h1>[시연] 일정 기능 살펴보기</h1><p>방문지 A~D는 사용자가 담을 자리만 나타냅니다. 장소 이름·사진·편의시설·날씨·축제·운영시간·이동 경로는 실제 제공처 조회 결과로만 확인합니다. 아래 시간은 체류와 휴식만 더한 값이며 이동시간을 포함하지 않습니다.</p><Link href="/planner">실제 관광정보로 여행 설계하기</Link></header>
    <div className="demo-scenarios" role="group" aria-label="시연 일정 선택">{demoScenarios.map((item, i) => <button type="button" disabled={!hydrated} key={item.title} aria-pressed={index === i} onClick={() => select(i)}>{item.title}</button>)}</div>
    <section className="demo-trip" aria-labelledby="demo-trip-title"><Image className="demo-cover" src={scenario.image} alt="실제 관광지 사진이 아닌 AI 생성 삽화" width={768} height={512} /><div><h2 id="demo-trip-title">{scenario.title}</h2><p>{scenario.description}</p><p>{scenario.days.length}일 · 방문 자리 {stops.length}곳 · 시설 및 이동 정보 미조회</p><p>실제 장소를 선택하려면 여행 설계에서 관광정보를 조회해 주세요.</p></div></section>
    <section aria-labelledby="demo-edit-title"><h2 id="demo-edit-title">일정을 직접 바꿔 보세요</h2><p>체류·휴식·순서·날짜는 사용자가 정하는 값입니다. 고정 방문도 이동이 미조회 상태이므로 정시 도착 여부를 판단할 수 없습니다.</p>
      <label className="demo-time-control">하루 시작 시각 <input type="time" value={startTime} disabled={!hydrated} onChange={(event) => { if (/^([01]\d|2[0-3]):[0-5]\d$/.test(event.target.value)) update(stops, event.target.value); }} /></label>
      <div className="demo-actions"><button type="button" disabled={!hydrated} onClick={() => setPending('rest')}>첫 방문 뒤 20분 쉬기</button><button type="button" disabled={!hydrated} onClick={() => setPending('visit')}>첫 방문 90분 머물기</button><button type="button" disabled={!previous} onClick={() => { if (previous) { setStops(previous.stops); setStartTime(previous.startTime); setPrevious(null); setNotice('직전 일정 변경을 되돌렸습니다.'); } }} data-icon-action="" title="되돌리기" aria-label="직전 일정 변경 되돌리기"><NightIcon name="undo" size={20}/></button></div>
      {pending && <div className="demo-proposal" role="region" aria-label="시연 변경안"><h3>변경안</h3><p>{pending === 'rest' ? '첫 방문 뒤 휴식을 20분으로 바꿉니다.' : '첫 방문 체류를 90분으로 바꿉니다.'} 방문 자리와 고정 시각은 유지합니다.</p><button type="button" onClick={apply}>변경안 적용</button><button type="button" onClick={() => setPending(null)}>취소</button></div>}
      {schedule.map((day) => <div key={day.label} className="demo-day"><h3>{day.label}</h3>{day.entries.length === 0 ? <p>이 날짜에 배치한 방문지가 없습니다.</p> : <ol className="demo-timeline">{day.entries.map((entry, position) => <li key={entry.id}><strong>{formatDemoTime(entry.start)}</strong><div><h4>{entry.label}</h4><p>체류 {entry.visitMinutes}분 · 휴식 {entry.breakMinutes}분 · 이동 미조회</p>{entry.fixedTime && <p className="demo-warning">약속 시각 {entry.fixedTime}{entry.fixedConflict ? ' · 체류·휴식만 계산해도 늦습니다.' : ' · 이동시간을 확인해야 도착 가능 여부를 알 수 있습니다.'}</p>}<div className="demo-stop-controls"><label>체류 <select value={entry.visitMinutes} onChange={(event) => change(entry.id, { visitMinutes: Number(event.target.value) })}>{[15, 30, 45, 60, 75, 90, 120, 150, 180].map((value) => <option key={value} value={value}>{value}분</option>)}</select></label><label>휴식 <select value={entry.breakMinutes} onChange={(event) => change(entry.id, { breakMinutes: Number(event.target.value) })}>{[0, 10, 15, 20, 30, 45, 60].map((value) => <option key={value} value={value}>{value}분</option>)}</select></label>{scenario.days.length > 1 && <label>날짜 <select value={entry.day} onChange={(event) => change(entry.id, { day: Number(event.target.value) })}>{scenario.days.map((label, i) => <option key={label} value={i}>{label}</option>)}</select></label>}<button type="button" disabled={position === 0} onClick={() => move(entry.id, -1)}>앞으로</button><button type="button" disabled={position === day.entries.length - 1} onClick={() => move(entry.id, 1)}>뒤로</button></div></div></li>)}</ol>}<p className="demo-day-end">{day.entries.length ? `방문·휴식만 계산한 종료 시각 ${formatDemoTime(day.entries.at(-1)!.end)}` : '계산할 방문이 없습니다.'}</p></div>)}
    </section>
    <section className="demo-proposal" aria-labelledby="demo-ready-title"><h2 id="demo-ready-title">출발 전 확인 연습</h2><p>체크해도 제공처 정보를 확인했다는 뜻은 아닙니다.</p><div className="demo-checklist">{checks.map((label, i) => <label key={label}><input type="checkbox" checked={checked[i]} onChange={() => setChecked((current) => current.map((value, j) => j === i ? !value : value))} />{label}</label>)}</div><p>{checked.filter(Boolean).length}/{checked.length}개 직접 표시 · 실제 조회 완료 상태와 별개</p></section>
    <section className="demo-proposal" aria-labelledby="demo-inquiry-title"><h2 id="demo-inquiry-title">현장 문의 카드 연습</h2><p>답변을 미리 채우지 않습니다. 방문할 실제 장소에서 직접 확인할 질문을 고르세요.</p><div className="demo-scenarios" role="group" aria-label="문의 주제">{questions.map((text, i) => <button key={text} type="button" aria-pressed={question === i} onClick={() => setQuestion(i)}>{['출입구', '화장실', '승강기', '주차'][i]}</button>)}</div><div className="demo-inquiry-card">{questions[question]}</div></section>
    <section className="demo-proposal" aria-labelledby="demo-save-title"><h2 id="demo-save-title">시연 일정 보관</h2><p>이 브라우저의 시연 전용 저장 공간에만 보관합니다. 실제 여행집·계정·공개 공유 링크와 연결되지 않습니다.</p><div className="demo-actions"><button type="button" onClick={save}>이 기기에 시연 저장</button><button type="button" onClick={restore}>시연 일정 다시 열기</button><button type="button" onClick={download}>시연 JSON 내려받기</button></div><p role="status">{notice}</p></section>
    <aside className="demo-proposal"><h2>실제 정보가 필요한 기능</h2><p>관광지·편의시설·축제·날씨·경로·나루의 실제 장소 제안은 시연 데이터로 대신하지 않습니다. 각 화면에서 조회 상태와 출처를 확인해 주세요.</p><div className="demo-actions"><Link href="/planner">여행지와 나루 열기</Link><Link href="/festivals">실제 축제 조회</Link><Link href="/community">커뮤니티 열기</Link></div></aside><DemoStories />
  </main><SiteFooter /></div>;
}
