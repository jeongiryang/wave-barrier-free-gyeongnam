'use client';
import { lazy, Suspense, useState } from 'react';
import type { Place } from '../types';
import PlaceInquiryCard from './PlaceInquiryCard';
const ParkingAlternatives = lazy(() => import('./ParkingAlternatives'));
const steps = [
  { title: '주차', keys: ['parking'], note: '주차장 위치와 출입구까지의 접근로를 함께 확인하세요.' },
  { title: '입구', keys: ['route', 'elevator'], note: '다른 출입구나 승강기 이용 안내가 있는지 확인하세요.' },
  { title: '시설', keys: ['restroom', 'lactationroom', 'guidehuman', 'audioguide', 'signguide'], note: '필요한 시설의 위치·운영 여부는 장소 안내에서 확인하세요.' },
];
export default function PlaceArrivalPreview({ place, onOpenRestrooms }: { place: Place; onOpenRestrooms?: () => void }) {
  const [activeState, setActiveState] = useState({ placeId: place.id, value: 0 });
  const [checkedState, setCheckedState] = useState<{ placeId: string; value: number[] }>({ placeId: place.id, value: [] });
  const active = activeState.placeId === place.id ? activeState.value : 0;
  const checked = checkedState.placeId === place.id ? checkedState.value : [];
  const setActive = (next: number | ((value: number) => number)) => setActiveState(current => {
    const value = current.placeId === place.id ? current.value : 0;
    return { placeId: place.id, value: typeof next === 'function' ? next(value) : next };
  });
  const setChecked = (next: number[] | ((value: number[]) => number[])) => setCheckedState(current => {
    const value = current.placeId === place.id ? current.value : [];
    return { placeId: place.id, value: typeof next === 'function' ? next(value) : next };
  });
  const step = steps[active];
  const lat = Number(place.mapY), lng = Number(place.mapX);
  const hasPoint = Boolean(place.mapX && place.mapY) && Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  const fields = place.accessibility?.filter(item => step.keys.includes(item.key)) || [];
  return <section className="place-arrival-preview" aria-label={`${place.name} 주차·입구·시설 미리보기`}>
    <h3>방문 전에 살펴보기</h3><nav aria-label="미리보기 순서">{steps.map((item, index) => <button key={item.title} type="button" aria-pressed={active === index} onClick={() => setActive(index)}>{index + 1}. {item.title}</button>)}</nav>
    <p>{place.name} · {place.address || '주소 미제공'}</p>
    {place.image && <details><summary>장소 대표 사진과 출처</summary><figure><img src={place.image} alt={`${place.name} 대표 사진`} loading="lazy" width={480} height={300} style={{ maxWidth: '100%', height: 'auto' }} /><figcaption>{place.source || '출처 미제공'} · <a href={place.image} target="_blank" rel="noopener noreferrer">사진 원본 ↗</a><p>주차장이나 입구를 특정한 사진은 아닙니다. 아래 등록된 시설 안내와 함께 살펴보세요.</p></figcaption></figure></details>}
    <div aria-live="polite"><h4>{step.title}</h4>{fields.length ? fields.map(item => <p key={item.key}><strong>{item.label}: {item.state === 'confirmed' ? '정보 있음' : item.state === 'negative' ? '이용 조건 확인' : '미확인'}</strong><br />{item.detail || '상세 안내가 제공되지 않았어요.'}</p>) : <p>이 장소의 {step.title} 상세 정보는 아직 확인하지 못했어요.</p>}<p>{step.note}</p></div>
    {active === 0 && <Suspense fallback={null}><ParkingAlternatives place={place} /></Suspense>}
    {active === 2 && <p><button type="button" onClick={() => { window.dispatchEvent(new CustomEvent('wave:open-restroom-finder', { detail: { contentId: place.id } })); onOpenRestrooms?.(); }}>주변 공중화장실</button></p>}
    {hasPoint && <div><a target="_blank" rel="noopener noreferrer" href={`https://map.kakao.com/link/roadview/${lat},${lng}`}>장소 주변 로드뷰 열기 ↗</a><a target="_blank" rel="noopener noreferrer" href={`https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${lat},${lng}`}>장소 지도 열기 ↗</a></div>}
    <small>공개 관광지 좌표를 기준으로 엽니다. 실제 입구·시설의 정확한 지점이나 최신 촬영 자료가 제공되지 않을 수 있어요. 로드뷰와 사진만으로 통행 가능 여부를 확정하지 않습니다.</small>
    <p><small>{place.source || '출처 미제공'} · {place.checkedAt || '조회 시각 미제공'}</small></p>
    <label><input type="checkbox" checked={checked.includes(active)} onChange={event => setChecked(previous => event.target.checked ? [...previous, active] : previous.filter(index => index !== active))} /> {step.title} 자료를 살펴봤어요</label>
    <p>{checked.length}/3단계 살펴봄 · 직접 읽은 기록이며 시설 이용 가능을 확인한 표시는 아닙니다.</p>
    {active < steps.length - 1 ? <button type="button" onClick={() => setActive(index => index + 1)}>다음: {steps[active + 1].title}</button> : <PlaceInquiryCard place={place} en={false} />}
  </section>;
}
