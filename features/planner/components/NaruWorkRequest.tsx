import { useState } from 'react';
import { GYEONGNAM_REGION_POINTS } from '../../../lib/gyeongnam-regions.js';
import { validTripDate, boundedTripEnd } from '../../../lib/trip-dates.js';

export default function NaruWorkRequest({ region, start, end, transport, disabled, onSubmit, onClose }: {
  region: string; start: string; end: string; transport: string; disabled: boolean;
  onSubmit: (prompt: string) => void; onClose: () => void;
}) {
  const [area, setArea] = useState(region || '경남 전체');
  const [from, setFrom] = useState(start), [to, setTo] = useState(end || start);
  const [party, setParty] = useState(''), [pace, setPace] = useState('보통');
  const [mode, setMode] = useState(transport), [notice, setNotice] = useState('');
  return <form className="naru-work-request" aria-label="여행 준비 맡기기" onSubmit={event => {
    event.preventDefault();
    if (!validTripDate(from) || !validTripDate(to) || boundedTripEnd(from, to) !== to) { setNotice('여행 날짜를 7일 이내로 골라주세요.'); return; }
    onSubmit(`${party ? `${party} ${area}` : area} 여행 일정안을 만들어줘. 여행 날짜는 ${from}부터 ${to}까지야. ${mode === 'car' ? '자동차' : mode === 'transit' ? '대중교통' : mode === 'bicycle' ? '자전거' : '도보'}로 이동해. ${pace === '가볍게' ? '걷는 부담을 줄이고 휴식 시간을 넉넉히 넣어줘.' : '보통 속도로 둘러보고 싶어.'} 현재 선택한 필수 편의와 고정 방문을 유지하고, 실제 관광정보로 확인한 장소를 제안해줘.`);
  }}>
    <header><h3>어떤 여행을 준비할까요?</h3><button type="button" onClick={onClose} aria-label="여행 준비 입력 닫기">×</button></header>
    <label>여행 지역<select value={area} onChange={event => setArea(event.target.value)}>{['경남 전체', ...Object.keys(GYEONGNAM_REGION_POINTS).filter(name => name !== '경남 전체')].map(name => <option key={name}>{name}</option>)}</select></label>
    <div><label>출발 날짜<input type="date" required value={from} onChange={event => { setFrom(event.target.value); if (!to || to < event.target.value) setTo(event.target.value); }} /></label><label>마지막 날짜<input type="date" required min={from} value={to} onChange={event => setTo(event.target.value)} /></label></div>
    <label>동행<select value={party} onChange={event => setParty(event.target.value)}><option value="">선택하지 않음</option>{['혼자', '부모님과', '친구와', '아이와', '연인과'].map(value => <option key={value}>{value}</option>)}</select></label>
    <label>이동수단<select value={mode} onChange={event => setMode(event.target.value)}><option value="car">자동차</option><option value="transit">대중교통</option><option value="walk">도보</option><option value="bicycle">자전거</option></select></label>
    <fieldset><legend>이동 부담</legend>{['가볍게', '보통'].map(value => <button type="button" key={value} aria-pressed={pace === value} onClick={() => setPace(value)}>{value}</button>)}</fieldset>
    {notice && <p role="status">{notice}</p>}
    <button type="submit" disabled={disabled}>이 조건으로 여행 준비 맡기기 →</button>
    <p>먼저 일정안을 보여드려요. 확인하고 적용할 수 있습니다.</p>
  </form>;
}
