"use client";

import { useEffect, useRef, useState } from 'react';
import type { useTripSelection } from '../hooks/useTripSelection';
import type { Place } from '../types';
import { plannerJson } from '../services/api';
import { CLIENT_BUDGET_MS } from '../../../lib/request-budget.js';
import { nearbyDownstreamStops, returnArrivalLabel, type PublicStop, type ReturnTransportInfo } from '../../../lib/transport/return-transport.js';

const copyStyle = { margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--muted)' } as const;
const cardStyle = { padding: 20, display: 'grid', gap: 12, alignContent: 'start', border: '1px solid var(--line)', borderRadius: 20, background: 'var(--white)', minWidth: 0 } as const;
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 16 } as const;
const labelStyle = { display: 'grid', gap: 8, fontSize: 14 } as const;
const selectStyle = { minHeight: 48, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--paper)', color: 'var(--ink)', font: 'inherit', fontSize: 16, width: '100%' } as const;
const stamp = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('ko-KR') : '조회 시각 미확인';

function PlaceReturnTransport({ place, targets }: { place: Place; targets: Place[] }) {
  const controller = useRef<AbortController | null>(null);
  const [info, setInfo] = useState<ReturnTransportInfo | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [now, setNow] = useState(() => Date.now()), [targetId, setTargetId] = useState('');
  const [allRoutes, setAllRoutes] = useState(false);
  useEffect(() => () => controller.current?.abort(), []);
  // Advance only the age label. Never poll a provider in the background.
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(timer); }, []);
  const target = targets.find(item => item.id === targetId);
  const nearby = nearbyDownstreamStops(info?.direction, target);

  async function load(stop?: PublicStop, routeId?: string) {
    if (busy) return;
    controller.current?.abort(); const request = new AbortController(); controller.current = request;
    setBusy(true); setError('');
    const params = new URLSearchParams({ action: 'return-transport', contentId: place.id });
    if (stop) { params.set('nodeId', stop.nodeId); params.set('cityCode', stop.cityCode); }
    if (routeId) params.set('routeId', routeId);
    try {
      const result = await plannerJson<ReturnTransportInfo>('/api/wave?' + params, { timeoutMs: CLIENT_BUDGET_MS.returnTransport, signal: request.signal });
      if (result.id !== place.id || !Array.isArray(result.stops) || !Array.isArray(result.routes)) throw new Error('Invalid transport response');
      if (!request.signal.aborted) { setInfo(result); setNow(Date.now()); if (!routeId) setAllRoutes(false); }
    } catch { if (!request.signal.aborted) setError('교통 정보를 확인하지 못했어요. 잠시 후 다시 확인하거나 카카오맵에서 교통편을 살펴보세요.'); }
    finally { if (!request.signal.aborted) setBusy(false); }
  }

  return <section aria-label="장소에서 돌아가는 교통" aria-busy={busy} style={{ display: 'grid', gap: 16, marginTop: 20 }}>
    <div className="travel-book-actions"><button type="button" disabled={busy} onClick={() => void load()}>{busy ? '교통 정보 확인 중…' : info ? '주변 정류장 다시 확인' : '주변 정류장 확인'}</button><a href={`https://map.kakao.com/link/search/${encodeURIComponent(place.name + ' ' + (place.address || ''))}`} target="_blank" rel="noreferrer">카카오맵에서 교통편 보기</a></div>
    {error && <p style={copyStyle} role="alert">{error}</p>}
    {info && <>
      <p style={copyStyle} role="status">{info.message || (info.status === 'empty' ? '제공된 주변 정류장이 없어요. 운행 여부는 현장 안내나 카카오맵에서 확인해 주세요.' : info.status === 'no-arrivals' ? '현재 제공된 도착 예정 정보가 없어요. 버스 운행 종료를 뜻하지는 않습니다.' : info.selected ? `${info.selected.name}의 도착 예정 노선 ${info.routes.length}개를 확인했어요.` : `주변 정류장 ${info.stops.length}곳을 확인했어요.`)}</p>
      <p style={copyStyle}>{info.source} · 정류장 조회 {stamp(info.checkedAt)}</p>
      {info.selected ? <label style={labelStyle}>주변 정류장 바꾸기<select style={selectStyle} disabled={busy} value={info.selected.cityCode+':'+info.selected.nodeId} onChange={event => { const stop=info.stops.find(item => item.cityCode+':'+item.nodeId===event.target.value); if(stop) void load(stop); }}>{info.stops.map(stop => <option key={stop.cityCode+':'+stop.nodeId} value={stop.cityCode+':'+stop.nodeId}>{stop.name} · {stop.distance===null?'거리 미확인':`직선 약 ${stop.distance}m`}</option>)}</select></label> : !!info.stops.length && <div style={gridStyle}>{info.stops.map(stop => <article key={stop.cityCode+':'+stop.nodeId} style={cardStyle}><h4 style={{ fontSize: 18, margin: 0 }}>{stop.name}</h4><p style={copyStyle}>{stop.distance === null ? '거리 미확인' : `장소에서 직선거리 약 ${stop.distance}m`} · 정류장 {stop.nodeId}</p><div className="travel-book-actions"><button type="button" disabled={busy} onClick={() => void load(stop)}>이 정류장의 버스 확인</button></div></article>)}</div>}
      {info.moreStops && <p style={copyStyle}>가까운 정류장 최대 8곳을 표시합니다. 다른 정류장은 지도에서 확인해 주세요.</p>}
      {info.selected && <section aria-label="선택한 정류장의 도착 정보" style={{ display: 'grid', gap: 12, marginTop: 8 }}>
        <h4 style={{ fontSize: 20, margin: 0 }}>{info.selected.name}에서 탈 버스</h4><p style={copyStyle}>도착 정보 조회 {stamp(info.arrivalCheckedAt)} · 조회 시점의 도착 예상입니다.</p>
        <div className="travel-book-actions"><button type="button" disabled={busy || (info.arrivalCheckedAt ? now-Date.parse(info.arrivalCheckedAt)<15000 : false)} onClick={() => void load(info.selected)}>도착 정보 다시 확인</button></div>
        {info.moreArrivals && <p style={copyStyle}>일부 노선의 도착 정보만 제공되었습니다.</p>}
        <div style={{ ...gridStyle, marginTop: 16 }}>{(allRoutes ? info.routes : info.routes.slice(0,6)).map(route => <article key={route.routeId} style={cardStyle}>
          <h4 style={{ fontSize: 20, margin: 0 }}>{route.routeName}번</h4>
          {route.vehicles.map((vehicle,index) => <p key={index}><strong>{index === 0 ? '다음 차' : '그다음 차'}</strong> · {returnArrivalLabel(vehicle.seconds, info.arrivalCheckedAt, now)}{vehicle.stopsAway === null ? '' : ` · ${vehicle.stopsAway}정류장 전`}{vehicle.vehicle ? ` · ${vehicle.vehicle}` : ''}</p>)}
          {route.vehicles.length < 2 && <p style={copyStyle}>그다음 차 정보는 아직 없어요.</p>}
          <div className="travel-book-actions"><button type="button" disabled={busy} aria-pressed={info.routeId === route.routeId} onClick={() => void load(info.selected, route.routeId)}>이 노선의 진행 방향 확인</button></div>
        </article>)}</div>
        {info.routes.length > 6 && <div className="travel-book-actions"><button type="button" aria-expanded={allRoutes} onClick={() => setAllRoutes(!allRoutes)}>{allRoutes ? '가까이 도착할 노선 6개만 보기' : `확인한 노선 ${info.routes.length}개 모두 보기`}</button></div>}
      </section>}
      {info.direction && <section aria-label="버스 진행 방향과 다음 이동" style={{ ...cardStyle, marginTop: 24 }}>
        <h4 style={{ fontSize: 20, margin: 0 }}>{info.direction.next ? `${info.selected?.name} → ${info.direction.next.name} 방면` : '진행 방향 확인 필요'}</h4>
        <p style={copyStyle}>{info.direction.reason || '아래는 이 정류장 이후의 노선 순서입니다.'} · 노선 조회 {stamp(info.routeCheckedAt)}</p>
        {info.direction.stops.length > 0 && <details className="place-evidence"><summary>이후 정류장 {info.direction.stops.length}곳</summary><ol style={{ paddingInlineStart: 24 }}>{info.direction.stops.map(stop => <li key={stop.order} style={{ paddingBlock: 8 }}>{stop.name}</li>)}</ol></details>}
        {!!targets.length && <><label style={labelStyle}>다음 이동 장소와 비교<select style={selectStyle} value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">일정에서 장소 고르기</option>{targets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{target && (nearby.length ? <ul>{nearby.map(stop => <li key={stop.order}>{stop.name} · {target.name}까지 직선거리 약 {stop.distance}m</li>)}</ul> : <p style={copyStyle}>이 방향에서 선택한 장소의 800m 이내 정류장을 확인하지 못했어요.</p>)}</>}
        {info.times && <p style={copyStyle}>노선 기점 {info.times.origin || '미확인'} · 종점 {info.times.destination || '미확인'}<br />기점 출발 첫차 {info.times.first || '미확인'} · 막차 {info.times.last || '미확인'}<br />이 정류장의 막차 도착 시각은 별도 확인이 필요합니다. 시간표 조회 {stamp(info.timesCheckedAt)}</p>}
      </section>}
    </>}
    <p style={copyStyle}>버스 방향과 정류장 거리만 비교합니다. 실제 횡단·보행 접근성, 탑승 가능 차량, 환승과 귀가 도착 시각은 별도로 확인해 주세요.</p>
  </section>;
}

export default function ReturnTransport({ trip }: { trip: ReturnType<typeof useTripSelection> }) {
  const places = trip.orderedSavedPlaces.filter(place => trip.tripDays.includes(trip.scheduleAssignments[place.id] || trip.tripDays[0]));
  const [chosen, setChosen] = useState('');
  const place = places.find(item => item.id === chosen) || places.at(-1);
  return <section aria-label="돌아가는 교통 확인" style={{ display: 'grid', gap: 14, padding: '16px 0' }}>
    <h3 style={{ fontSize: 22, margin: 0 }}>풍경을 만난 뒤, 다음 이동도 편하게</h3><p style={copyStyle}>일정에 담은 장소 주변의 정류장을 고르고 버스 도착과 진행 방향을 확인하세요.</p>
    {place ? <><label style={labelStyle}>어디에서 이동하나요?<select style={selectStyle} value={place.id} onChange={event => setChosen(event.target.value)}>{places.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><PlaceReturnTransport key={place.id} place={place} targets={places.filter(item => item.id !== place.id)} /></> : <p style={copyStyle}>일정에 장소를 담으면 돌아가는 교통을 확인할 수 있어요.</p>}
  </section>;
}
