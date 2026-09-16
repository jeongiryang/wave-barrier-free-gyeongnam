'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Place } from '../types';
import { optionalPlannerJson } from '../services/api';
import { CLIENT_BUDGET_MS } from '../../../lib/request-budget.js';
import { parkingDistanceMeters, type ParkingAlternative, type PublicPoint } from '../../../lib/parking-alternatives.js';

type Response = { status: 'available' | 'empty'; contentId: string; checkedAt: string; source: '전국주차장정보표준데이터'; items: ParkingAlternative[] };
type State = 'idle' | 'loading' | 'available' | 'empty' | 'error' | 'cancelled';
const caution = '실시간 빈자리와 입구까지의 계단 없는 길은 확인되지 않았어요.';

export default function ParkingAlternatives({ place }: { place: Place }) {
  const [state, setState] = useState<State>('idle');
  const [data, setData] = useState<Response | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState('');
  const [reference, setReference] = useState('place');
  const [devicePoint, setDevicePoint] = useState<PublicPoint | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  const previousPlace = useRef(place.id);
  const placePoint = useMemo(() => ({ latitude: Number(place.mapY), longitude: Number(place.mapX) }), [place.mapX, place.mapY]);

  useEffect(() => {
    if (previousPlace.current !== place.id) {
      request.current?.abort();
      previousPlace.current = place.id;
      setData(null); setExpanded(false); setSelected(''); setReference('place'); setDevicePoint(null);
      setState('cancelled');
    }
    return () => request.current?.abort();
  }, [place.id]);

  const load = async () => {
    if (data) { setExpanded(value => !value); return; }
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setExpanded(true); setState('loading');
    const result = await optionalPlannerJson<Response>(`/api/wave?action=parking-alternatives&contentId=${encodeURIComponent(place.id)}`, { signal: controller.signal, timeoutMs: CLIENT_BUDGET_MS.parkingAlternatives });
    if (controller.signal.aborted) return;
    request.current = null;
    if (!result) { setState('error'); return; }
    setData(result); setState(result.status); setExpanded(true);
  };

  const useCurrentLocation = () => {
    setLocationMessage('');
    if (!navigator.geolocation) { setLocationMessage('현재 위치를 사용할 수 없어 선택한 기준 장소 순서를 유지해요.'); return; }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const point = { latitude: coords.latitude, longitude: coords.longitude };
      setDevicePoint(point); setReference('device'); setLocationMessage('현재 위치와 공개 주차장 좌표를 이 기기 안에서만 비교했어요.');
    }, error => {
      setDevicePoint(null); setReference('place');
      setLocationMessage(error.code === error.TIMEOUT ? '위치 확인 시간이 지나 선택한 기준 장소 순서를 유지해요.' : '위치 권한 없이 선택한 기준 장소 순서를 유지해요.');
    }, { enableHighAccuracy: false, timeout: 7000, maximumAge: 0 });
  };

  const manualPoint = reference.startsWith('parking:') ? data?.items.find(item => `parking:${item.id}` === reference)?.destination : placePoint;
  const sorted = useMemo(() => [...(data?.items || [])].sort((a, b) => {
    const base = reference === 'device' ? devicePoint : manualPoint;
    return base ? parkingDistanceMeters(base, a.destination) - parkingDistanceMeters(base, b.destination) : a.distanceMeters - b.distanceMeters;
  }), [data, devicePoint, manualPoint, reference]);

  return <section className="parking-alternatives" aria-label="주변 주차장">
    <h5>주변 주차장</h5>
    <p>관광지 주변에서 장애인전용주차구역이 등록된 주차장을 찾아봐요.</p>
    <button type="button" aria-busy={state === 'loading'} disabled={state === 'loading'} onClick={() => void load()}>{state === 'loading' ? '주변 주차장을 찾고 있어요.' : data && expanded ? '목록 접기' : '주변 주차장 보기'}</button>
    {expanded && data && <div className="parking-results" aria-live="polite">
      <header><strong>등록 정보가 있는 주차장 {data.items.length}곳</strong><span>조회 {new Date(data.checkedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span></header>
      {!!data.items.length && <div className="parking-sort-controls">
        <label>기준 장소 선택<select value={reference === 'device' ? 'place' : reference} onChange={event => { setReference(event.target.value); setDevicePoint(null); }}><option value="place">{place.name}</option>{data.items.map(item => <option key={item.id} value={`parking:${item.id}`}>{item.name}</option>)}</select></label>
        <button type="button" onClick={useCurrentLocation}>현재 위치에서 가까운 순</button>
        {locationMessage && <p role="status">{locationMessage}</p>}
      </div>}
      {data.status === 'empty' ? <p>공식 데이터에서 조건에 맞는 주변 주차장을 찾지 못했어요.</p> : <div className="parking-list">{sorted.map(item => <article key={item.id}>
        <h6>{item.name}</h6>
        <p><strong>장애인전용주차구역 보유 정보</strong><br />공식 데이터에 보유로 등록</p>
        <dl><dt>직선거리</dt><dd>관광지에서 직선 {item.distanceMeters.toLocaleString('ko-KR')}m</dd><dt>운영시간</dt><dd>{item.operatingHours || '확인 필요'}</dd><dt>요금</dt><dd>{item.feeInformation || '확인 필요'}</dd><dt>관리기관</dt><dd>{item.institutionName || '확인 필요'}</dd><dt>전화번호</dt><dd>{item.phoneNumber || '연락처 정보 없음'}</dd><dt>데이터 기준일</dt><dd>{item.referenceDate}</dd></dl>
        <small>{caution}</small>
        <div className="parking-actions"><button type="button" aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>도착지로 선택</button>{item.phoneNumber && <a href={`tel:${item.phoneNumber.replace(/[^0-9+]/g, '')}`}>전화로 물어보기</a>}<a target="_blank" rel="noopener noreferrer" href={`https://map.kakao.com/link/map/${encodeURIComponent(item.name)},${item.destination.latitude},${item.destination.longitude}`}>지도에서 보기</a></div>
        {selected === item.id && <p role="status">일정과 시간은 바꾸지 않고 도착 참고정보로 선택했어요.</p>}
      </article>)}</div>}
    </div>}
    {expanded && state === 'error' && <p role="alert">주차장 정보를 불러오지 못했어요. 관광지의 주차 안내는 계속 볼 수 있어요.</p>}
    {state === 'cancelled' && <p role="status">장소가 바뀌어 이전 검색을 멈췄어요.</p>}
    <small className="parking-caution">{caution}</small>
  </section>;
}
