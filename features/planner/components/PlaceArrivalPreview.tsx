'use client';
import { lazy, Suspense, useState } from 'react';
import type { Place } from '../types';
import PlaceInquiryCard from './PlaceInquiryCard';
import { WHEELCHAIR_ROUTE_DISCLAIMER, wheelchairRouteStateText } from '../../../lib/wheelchair-route-info.js';
import { SLOPE_DESCRIPTION_DISCLAIMER } from '../../../lib/slope-description.js';
const PowerchairChargingNotice = lazy(() => import('./PowerchairChargingNotice'));
const DiningAccessibilityList = lazy(() => import('./DiningAccessibilityList'));
const StayFacilityDetail = lazy(() => import('./StayFacilityDetail'));
const ParkingAlternatives = lazy(() => import('./ParkingAlternatives'));
const steps = [
  { title: '주차', keys: ['parking'], note: '주차장 위치와 출입구까지의 접근로를 함께 확인하세요.' },
  { title: '입구', keys: ['route', 'elevator'], note: '다른 출입구나 승강기 이용 안내가 있는지 확인하세요.' },
  { title: '시설', keys: ['restroom', 'lactationroom', 'guidehuman', 'audioguide', 'signguide', 'helpdog'], note: '필요한 시설의 위치·운영 여부는 장소 안내에서 확인하세요.' },
];
export default function PlaceArrivalPreview({ place, onOpenRestrooms, onClose }: { place: Place; onOpenRestrooms?: () => void; onClose?: () => void }) {
  const [activeState, setActiveState] = useState({ placeId: place.id, value: 0 });
  const [checkedState, setCheckedState] = useState<{ placeId: string; value: number[] }>({ placeId: place.id, value: [] });
  const [orderHelp, setOrderHelp] = useState<{ token: number; mode: 'inquiry' | 'communication' } | null>(null);
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
    {place.image && <details><summary>장소 대표 사진과 출처</summary><figure><img src={place.image} alt={`${place.name} 대표 사진`} loading="lazy" width={480} height={300} style={{ maxWidth: '100%', height: 'auto' }} /><figcaption>{place.source || '출처 미제공'} · <a href={place.image} target="_blank" rel="noopener noreferrer">사진 원본</a><p>주차장이나 입구를 특정한 사진은 아닙니다. 아래 등록된 시설 안내와 함께 살펴보세요.</p></figcaption></figure></details>}
    <div aria-live="polite"><h4>{step.title}</h4>{fields.length ? fields.map(item => item.key === 'route'
      ? <div key={item.key}>
          <p><strong>{item.label}: {item.state === 'confirmed' ? '정보 있음' : item.state === 'negative' ? '이용 조건 확인' : '미확인'}</strong></p>
          {/* 접근로 원문은 요약·재작성 없이 인용 형태로 그대로 보여준다(스펙 16). 값이
              없을 때만 이미 있는 confirmed/negative/unknown 고정 문구로 대체한다. */}
          {item.detail
            ? <blockquote style={{ borderLeft: '3px solid var(--line)', margin: '4px 0', padding: '2px 0 2px 12px', color: 'var(--ink)' }}>{item.detail}</blockquote>
            : <p>{wheelchairRouteStateText(item.state)}</p>}
          <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>{SLOPE_DESCRIPTION_DISCLAIMER}</p>
        </div>
      : <p key={item.key}><strong>{item.label}: {item.state === 'confirmed' ? '정보 있음' : item.state === 'negative' ? '이용 조건 확인' : '미확인'}</strong><br />{item.detail || '상세 안내가 제공되지 않았어요.'}</p>) : <p>이 장소의 {step.title} 상세 정보는 아직 확인하지 못했어요.</p>}<p>{step.note}</p></div>
    {active === 0 && <Suspense fallback={null}><ParkingAlternatives place={place} /></Suspense>}
    {active === 2 && <p><button type="button" onClick={() => { window.dispatchEvent(new CustomEvent('wave:open-restroom-finder', { detail: { contentId: place.id } })); onOpenRestrooms?.(); }}>주변 공중화장실</button></p>}
    {hasPoint && <div><a target="_blank" rel="noopener noreferrer" href={`https://map.kakao.com/link/roadview/${lat},${lng}`}>장소 주변 로드뷰 열기</a><a target="_blank" rel="noopener noreferrer" href={`https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${lat},${lng}`}>장소 지도 열기</a></div>}
    {step.title === '주차' && <Suspense fallback={null}><PowerchairChargingNotice /></Suspense>}
    {/* 스펙 08: 음식점 편의 정보는 '시설' 단계에서만 요청한다. 기존 3단계 구조와 체크 기록은 그대로 둔다. */}
    {step.title === '시설' && <Suspense fallback={null}><DiningAccessibilityList place={place} onClose={onClose} /></Suspense>}
    {/* 스펙 48: 숙소(contentTypeId "32")일 때만 숙소 전용 편의 묶음을 더한다. 다른 타입의 화면은 바뀌지 않는다. */}
    {step.title === '시설' && place.contentTypeId === '32' && <Suspense fallback={null}><StayFacilityDetail place={place} /></Suspense>}
    {/* 스펙 44: 1인 메뉴·단체석·좌석 형태를 주는 공공데이터가 없다는 사실만 안내한다. 거르기를 만들지 않는다. 문의 링크는 이 단계 아래의 PlaceInquiryCard(#545)를 그대로 쓴다. */}
    {step.title === '시설' && <>
      <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>자리 형태와 1인 주문 가능 여부는 공공데이터에 등록돼 있지 않아요. 미리 물어보면 확실해요.</p>
      <div className="place-inquiry-entry"><div><h3>주문 방식 확인</h3><p>주문 방식은 공공데이터에 등록돼 있지 않아요. 미리 물어보거나 현장에서 화면으로 요청할 수 있어요.</p></div><p><button type="button" onClick={() => setOrderHelp({ token: Date.now(), mode: 'inquiry' })}>방문 전에 문의하기</button> <button type="button" onClick={() => setOrderHelp({ token: Date.now(), mode: 'communication' })}>현장에서 화면으로 요청</button></p></div>
    </>}
    {step.title === '입구' && <div className="place-inquiry-entry">
      <div>
        <h3>휠체어 통행 정보</h3>
        <p>{wheelchairRouteStateText(place.accessibility?.find(item => item.key === 'route')?.state)}</p>
        <p>{WHEELCHAIR_ROUTE_DISCLAIMER}</p>
      </div>
      <p>현장에서 다른 점을 확인했다면 <button type="button" className="simple-text-link" onClick={() => setActive(steps.length - 1)}>문의 카드 만들기</button>로 미리 질문을 준비해 방문 시 물어보세요.</p>
    </div>}
    {step.title === '입구' && <div className="door-inquiry-entry">
      <p>출입문 종류는 공공데이터에 등록돼 있지 않아요. 미리 물어보거나 현장에서 화면으로 요청할 수 있어요.</p>
      <PlaceInquiryCard place={place} en={false} suggestedOption="door" onsiteLabel="현장에서 화면으로 요청하기" />
    </div>}
    <small>공개 관광지 좌표를 기준으로 엽니다. 실제 입구·시설의 정확한 지점이나 최신 촬영 자료가 제공되지 않을 수 있어요. 로드뷰와 사진만으로 통행 가능 여부를 확정하지 않습니다.</small>
    <p><small>{place.source || '출처 미제공'} · {place.checkedAt || '조회 시각 미제공'}</small></p>
    <label><input type="checkbox" checked={checked.includes(active)} onChange={event => setChecked(previous => event.target.checked ? [...previous, active] : previous.filter(index => index !== active))} /> {step.title} 자료를 살펴봤어요</label>
    <p>{checked.length}/3단계 살펴봄 · 직접 읽은 기록이며 시설 이용 가능을 확인한 표시는 아닙니다.</p>
    {active < steps.length - 1 ? <button type="button" onClick={() => setActive(index => index + 1)}>다음: {steps[active + 1].title}</button> : <PlaceInquiryCard key={`${place.id}:${orderHelp?.token || 0}`} place={place} en={false} startMode={orderHelp?.mode} />}
  </section>;
}
