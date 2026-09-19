'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { optionalPlannerJson } from '../services/api';
import { CLIENT_BUDGET_MS } from '../../../lib/request-budget.js';
import { parkingDistanceMeters, type PublicPoint } from '../../../lib/parking-alternatives.js';
import type { RestroomAlternative } from '../../../lib/restroom-alternatives.js';
import { restroomTemporaryStop } from '../../../lib/restroom-temporary-stop.js';
import type { Place } from '../types';
import type { useTripSelection } from '../hooks/useTripSelection';

type Response = { status: 'available' | 'empty'; contentId: string; checkedAt: string; items: RestroomAlternative[] };
const labels: Record<string, string> = { entranceStep: '입구 문턱', entranceDoor: '출입문', grabBars: '손잡이', turningSpace: '회전공간', sinkAccess: '세면대 접근', elevatorRequired: '승강기 필요 여부', emergencyBell: '비상벨' };
const stateLabel: Record<string, string> = { confirmed: '등록 정보 있음', partially_confirmed: '일부 정보만 있음', needs_confirmation: '전화 확인 필요', unavailable: '정보 없음', unknown: '정보 없음', user_reported: '이용자 제보' };

export default function RestroomAlternativeCards({ anchor, trip, minutes, pinnedAfter }: { anchor: Place; trip: ReturnType<typeof useTripSelection>; minutes: number; pinnedAfter: boolean }) {
  const [data, setData] = useState<Response | null>(null), [state, setState] = useState<'idle'|'loading'|'empty'|'available'|'error'>('idle');
  const [preview, setPreview] = useState(''), [notice, setNotice] = useState(''), [device, setDevice] = useState<PublicPoint | null>(null), [locationMessage, setLocationMessage] = useState('');
  const controller = useRef<AbortController | null>(null), generation = useRef(0);
  const loadedFor = useRef('');
  useEffect(() => () => controller.current?.abort(), []);
  const load = async () => {
    controller.current?.abort(); const current = ++generation.current, request = new AbortController(); controller.current = request;
    setState('loading'); setNotice(''); loadedFor.current = anchor.id;
    const result = await optionalPlannerJson<Response>(`/api/wave?action=restroom-alternatives&contentId=${encodeURIComponent(anchor.id)}`, { signal: request.signal, timeoutMs: CLIENT_BUDGET_MS.restroomAlternatives });
    if (request.signal.aborted || current !== generation.current || loadedFor.current !== anchor.id) return;
    controller.current = null; if (!result) { setState('error'); return; } setData(result); setState(result.status);
  };
  const sorted = useMemo(() => [...(data?.items || [])].sort((a,b) => device ? parkingDistanceMeters(device, a.destination) - parkingDistanceMeters(device, b.destination) : a.distanceFromPlaceMeters - b.distanceFromPlaceMeters), [data, device]);
  const nearMe = () => {
    setLocationMessage(''); if (!navigator.geolocation) { setDevice(null); setLocationMessage('현재 위치를 사용할 수 없어 일정 장소 기준 순서를 유지해요.'); return; }
    navigator.geolocation.getCurrentPosition(({ coords }) => { setDevice({ latitude: coords.latitude, longitude: coords.longitude }); setLocationMessage('현재 위치와 공개 화장실 좌표를 이 기기 메모리에서만 비교했어요.'); }, error => { setDevice(null); setLocationMessage(error.code === error.TIMEOUT ? '위치 확인 시간이 지나 일정 장소 기준 순서를 유지해요.' : '위치 권한 없이 일정 장소 기준 순서를 유지해요.'); }, { enableHighAccuracy: false, timeout: 7000, maximumAge: 0 });
  };
  return <section aria-label="주변 공중화장실" className="restroom-alternatives">
    <h3>주변 공중화장실</h3><p>일정에 있는 장소뿐 아니라 주변 공중화장실도 찾아봐요.</p>
    <button type="button" disabled={state === 'loading'} aria-busy={state === 'loading'} onClick={() => void load()}>{state === 'loading' ? '공중화장실 정보를 찾고 있어요.' : '공중화장실 더 보기'}</button>
    {state === 'error' && <p role="alert">공중화장실 정보를 불러오지 못했어요. 일정은 그대로예요.</p>}
    {state === 'empty' && <p role="status">공식 데이터에서 주변 공중화장실을 찾지 못했어요.</p>}
    {state === 'available' && <><div className="parking-sort-controls"><label>기준 장소 선택<select value="place" onChange={() => setDevice(null)}><option value="place">{anchor.name}</option></select></label><button type="button" onClick={nearMe}>현재 위치에서 가까운 순</button>{locationMessage && <p role="status">{locationMessage}</p>}</div>
      <div className="restroom-list">{sorted.map(item => { const official = item.sources.find(source => source.type === 'official'); const unknown = Object.entries(item.evidence).filter(([key, value]) => key !== 'accessibleToilet' && value === 'unknown'); return <article className="reference-info-card" key={item.id}>
        <h4>{item.name}{item.floor ? ` · ${item.floor}` : ''}</h4><p><a target="_blank" rel="noopener noreferrer" href={`https://map.kakao.com/link/map/${encodeURIComponent(item.name)},${item.destination.latitude},${item.destination.longitude}`}>{item.address}</a></p>
        <p><strong>등록 정보 있음 · 장애인용 대변기 등록</strong></p><p>{item.openingHours || '개방시간 확인 필요'}</p><p>{device ? '현재 위치' : anchor.name}에서 직선 {(parkingDistanceMeters(device || { latitude: Number(anchor.mapY), longitude: Number(anchor.mapX) }, item.destination) / 1000).toFixed(1)}km</p>
        <p>확인된 정보: 장애인용 대변기</p><details><summary>아직 모르는 정보</summary><p>{unknown.map(([key]) => labels[key]).join(', ') || '없음'} · 모두 {stateLabel.unknown}</p></details>
        <details><summary>시설 정보 자세히</summary>{Object.entries(item.evidence).map(([key, value]) => <p key={key}>{key === 'accessibleToilet' ? '장애인용 대변기' : labels[key]}: {stateLabel[value]}</p>)}{item.sources.filter(source => source.type === 'community').map(source => <p key={`${source.provider}:${source.reportedAt}`}>이용자 경험 · {source.provider} · {source.reportedAt || '제보 시각 미제공'}</p>)}</details>
        <p><small>{official?.provider || '공식 제공처'} · 기준일 {official?.referenceDate || '확인 필요'}</small></p>
        <div className="travel-book-actions"><button type="button" disabled={pinnedAfter || trip.saved.length >= 12} onClick={() => { setPreview(item.id); setNotice(''); }}>경유지로 추가</button>{item.phoneNumber ? <a href={`tel:${item.phoneNumber.replace(/[^0-9+]/g,'')}`}>전화로 물어보기</a> : <button type="button" disabled>전화로 물어보기</button>}<button type="button" onClick={() => setNotice(`${item.name} · ${item.phoneNumber || '전화번호 확인 필요'} · 문턱·문폭·회전공간과 현재 운영 여부를 확인해 주세요.`)}>문의 카드 만들기</button><a href="https://www.data.go.kr/data/15012892/standard.do" target="_blank" rel="noopener noreferrer">정보가 달라요</a></div>
        {preview === item.id && <div className="restroom-confirm"><p>{item.name}을 {anchor.name} 다음에 추가할까요?</p><button type="button" onClick={() => { const place = restroomTemporaryStop(item); if (place && trip.addRestStop(anchor.id, place, minutes, 'restroom')) { setPreview(''); setNotice('화장실 경유지를 일정에 추가했어요.'); } else setNotice(trip.commandNotice || '경유지를 추가하지 못했어요. 일정은 그대로예요.'); }}>추가</button><button type="button" onClick={() => setPreview('')}>취소</button></div>}
        <p><small>장애인용 대변기 등록 정보예요. 문턱·문폭·회전공간과 현재 운영 여부는 전화로 확인해 주세요.</small></p>
      </article>})}</div></>}
    {notice && <p role="status">{notice} {notice.startsWith('화장실 경유지') && <button type="button" onClick={() => { if (trip.undoCommand()) setNotice('화장실 경유지 추가를 되돌렸어요.'); }}>되돌리기</button>}</p>}
  </section>;
}
