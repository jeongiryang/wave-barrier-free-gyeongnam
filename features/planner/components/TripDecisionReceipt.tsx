"use client";

import { useMemo, useState } from 'react';
import { usableLegRoutes } from '../../../lib/itinerary-legs.js';
import { buildTripDecisionReceipt, tripDecisionReceiptText, type DecisionRoute } from '../../../lib/trip-decision-receipt.js';
import type { useItineraryRoutes } from '../hooks/useItineraryRoutes';
import type { useRoutePlanning } from '../hooks/useRoutePlanning';
import type { useTripSelection } from '../hooks/useTripSelection';
import type { Place } from '../types';

const travelModeLabel = { car: '자동차', transit: '대중교통', walk: '도보', bicycle: '자전거' };
const stateLabel = { confirmed: '확인', negative: '없음', unknown: '미확인' };
const checkedAtLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Seoul' }).format(date);
};

export default function TripDecisionReceipt({ archiveContext, coverage, route, trip, onSelectPlace }: {
  archiveContext: { region: string; theme: string; profiles: string[] };
  coverage: ReturnType<typeof useItineraryRoutes>;
  route: ReturnType<typeof useRoutePlanning>;
  trip: ReturnType<typeof useTripSelection>;
  onSelectPlace: (place: Place) => void;
}) {
  const [notice, setNotice] = useState('');
  const receipt = useMemo(() => {
    const routes: DecisionRoute[] = coverage.legs.map(leg => {
      const best = usableLegRoutes(coverage.data[leg.key], route.routeTravelMode)[0];
      return {
        day: leg.day, from: leg.blocked ? '기기 안 출발지' : leg.fromLabel, to: leg.place.name,
        state: leg.blocked ? 'private' : best ? 'confirmed' : 'unknown',
        provider: best?.provider, minutes: best?.totalTime,
      };
    });
    return buildTripDecisionReceipt({
      region: archiveContext.region, theme: archiveContext.theme,
      travelStart: trip.travelStart, travelEnd: trip.travelEnd,
      travelMode: travelModeLabel[route.routeTravelMode], requiredKeys: archiveContext.profiles,
      places: trip.orderedSavedPlaces, routes,
    });
  }, [archiveContext.region, archiveContext.theme, archiveContext.profiles, coverage.legs, coverage.data, route.routeTravelMode, trip.travelStart, trip.travelEnd, trip.orderedSavedPlaces]);

  function downloadReceipt() {
    try {
      const url = URL.createObjectURL(new Blob([tripDecisionReceiptText(receipt)], { type: 'text/plain;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `WAVE-결정근거-${trip.travelStart}.txt`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('현재 일정의 결정 근거를 저장했어요.');
    } catch { setNotice('결정 근거 파일을 저장하지 못했어요. 화면의 일정은 그대로예요.'); }
  }

  if (!receipt.totals.places) return null;
  const placeById = new Map(trip.orderedSavedPlaces.map(place => [place.id, place]));
  return <details className="trip-decision-receipt" data-planner-tool="receipt">
    <summary>
      <span><strong>선택한 편의 확인</strong></span>
      <span>{receipt.criteria.facilities.length ? `확인 ${receipt.totals.confirmed} · 미확인 ${receipt.totals.unknown}` : '편의 조건 선택 안 함'}</span>
      <span aria-hidden="true">⌄</span>
    </summary>
    <div className="trip-decision-body">

      <section aria-labelledby="decision-criteria-title">
        <h3 id="decision-criteria-title">내가 정한 조건</h3>
        <dl className="trip-decision-criteria"><div><dt>지역·활동</dt><dd>{receipt.criteria.region} · {receipt.criteria.theme}</dd></div><div><dt>날짜·이동</dt><dd>{receipt.criteria.travelStart} — {receipt.criteria.travelEnd} · {receipt.criteria.travelMode}</dd></div><div><dt>필요한 편의</dt><dd>{receipt.criteria.facilities.length ? receipt.criteria.facilities.map(item => item.label).join(', ') : '선택 안 함'}</dd></div></dl>
      </section>
      <section aria-labelledby="decision-evidence-title">
        <div className="trip-decision-section-heading"><div><h3 id="decision-evidence-title">장소별 공공데이터 근거</h3></div><div className="trip-decision-counts" aria-label="편의 정보 대조 결과"><span>확인 <b>{receipt.totals.confirmed}</b></span><span>없음 <b>{receipt.totals.negative}</b></span><span>미확인 <b>{receipt.totals.unknown}</b></span></div></div>
        <div className="trip-decision-places">{receipt.places.map(place => <article key={place.id}>
          <div><h4>{place.name}</h4><p>{place.source} · 관광 콘텐츠 ID {place.id}</p><small title={place.checkedAt}>자료 확인 {checkedAtLabel(place.checkedAt)}</small></div>
          {place.evidence.length ? <ul>{place.evidence.map(item => <li key={item.key} data-state={item.state}><span>{item.label}</span><b>{stateLabel[item.state]}</b><small>{item.detail}</small></li>)}</ul> : <p>따로 선택한 편의 조건이 없습니다.</p>}
          <button type="button" onClick={() => { const original = placeById.get(place.id); if (original) onSelectPlace(original); }}>원문·시설 보기</button>
        </article>)}</div>
      </section>
      <section aria-labelledby="decision-routes-title">
        <div className="trip-decision-section-heading"><div><h3 id="decision-routes-title">이동 구간 근거</h3><p>{receipt.totals.confirmedRoutes}/{receipt.totals.routes}개 구간의 경로를 조회했습니다.</p></div></div>
        <ul className="trip-decision-routes">{receipt.routes.map((item, index) => <li key={`${item.day}-${item.to}-${index}`}><span>{item.day} · {item.from} → {item.to}</span><b>{item.state === 'confirmed' ? `${item.provider} · 약 ${item.minutes}분` : item.state === 'private' ? '기기 안 출발지 · 외부 조회 안 함' : '경로 미확인'}</b></li>)}</ul>
        <p className="trip-decision-limit">경로 조회는 휠체어 통행, 경사, 엘리베이터 운영을 보장하지 않습니다. 미확인 항목은 방문 전에 운영기관에 확인해 주세요.</p>
      </section>
      <button className="trip-decision-download" type="button" onClick={downloadReceipt}>결정 근거 저장</button>
      {notice && <p role="status" className="trip-decision-notice">{notice}</p>}
    </div>
  </details>;
}
