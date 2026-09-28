import Image from 'next/image';
import type { Place } from '../types';
import { safeTourismImageUrl } from '../../tourism/image-url';
import type { NaruJourney } from '../../../lib/naru-journey.js';
import NightIcon from '../../../components/NightIcon';

export default function NaruJourneyProposal({ draft, disabled, applied, onApply, onExplore, onDetails }: { draft: NaruJourney; disabled: boolean; applied: boolean; onApply: () => void; onExplore: () => void; onDetails: (place: Place) => void }) {
  const placeLabel = (id: string, name: string) => { const place = draft.stops.find(stop => stop.place.id === id)?.place || draft.plan.places.find(item => item.id === id); return place ? <button type="button" className="naru-proposal-place" onClick={() => onDetails(place)}>{name}<NightIcon name="info" size={18}/></button> : <strong>{name}</strong>; };
  if (draft.outcome?.kind === 'unchanged') return <section className="naru-journey-proposal" aria-label="나루의 일정 확인 결과">
    <header><strong>현재 일정을 그대로 유지해요</strong><small>{draft.outcome.kept.length}곳 유지</small></header>
    <p>공식 소개에서 실내 공간을 확인했어요. 장소·날짜·방문 시간·휴식·이동수단은 바꾸지 않았어요.</p>
    <ol>{draft.outcome.kept.map(stop => <li key={stop.id}>{placeLabel(stop.id, `${stop.date.slice(5)} · ${stop.name}`)}<span>기존 방문 유지</span></li>)}</ol>
    {draft.warnings.length > 0 && <details open><summary>방문 전 확인</summary><ul>{draft.warnings.map(text => <li key={text}>{text}</li>)}</ul></details>}
    {disabled && <p>여행 조건이 달라졌다면 현재 일정에서 다시 확인해 주세요.</p>}
  </section>;
  const unknown = draft.stops.reduce((sum, stop) => sum + stop.unknown.length, 0);
  return <section className="naru-journey-proposal" aria-label="나루의 실제 일정안">
    <header><span className="naru-card-symbol"><NightIcon name="calendar" /></span><div><strong>{draft.region} · {draft.start.slice(5)}{draft.end !== draft.start && ` – ${draft.end.slice(5)}`} 일정안</strong><small>{draft.restOnly ? '기존 장소 보존 · 순서와 휴식 조정' : `${draft.stops.length}곳 · ${draft.relaxed ? '쉬엄쉬엄' : '가볍게 둘러보기'}`}</small></div><span className="naru-proposal-state">{applied ? '반영 완료' : '적용 전'}</span></header>
    {draft.adjustment && <div aria-label="기존 일정 조정 내용"><p>{draft.adjustment.basis}</p>
      <strong>직선거리 참고 · 변경 전 · 변경 후</strong>
      {draft.adjustment.distance?.before && draft.adjustment.distance.after ? <>
        <ol aria-label="직선거리 전후 비교">
          <li><strong>구간 거리 합계</strong><span>{draft.adjustment.distance.before.totalKm.toFixed(1)} · {draft.adjustment.distance.after.totalKm.toFixed(1)}km</span></li>
          <li><strong>가장 긴 구간</strong><span>{draft.adjustment.distance.before.longestLegKm.toFixed(1)} · {draft.adjustment.distance.after.longestLegKm.toFixed(1)}km</span></li>
        </ol>
        <p>{draft.adjustment.distance.after.originIncluded ? '각 방문일의 출발지부터 계산했어요.' : '출발지 없이 날짜별 첫 장소부터 계산했어요.'} 날짜 사이 이동과 귀가 구간은 제외하며 실제 도로 거리·소요시간과 달라요.</p>
      </> : <p>좌표가 부족해 직선거리 전후 비교를 할 수 없어요.</p>}
      <p>방문 {draft.adjustment.changes.length}곳 유지 · 전체 휴식 {draft.adjustment.changes.reduce((sum, change) => sum + change.breakBefore, 0)} · {draft.adjustment.changes.reduce((sum, change) => sum + change.breakAfter, 0)}분</p>
      {!!draft.adjustment.warnings?.length && <div><strong>적용 전 확인</strong><ul>{draft.adjustment.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>}
      <p>이동시간과 운영시간까지 확인한 결과는 아니에요. 적용 후 여행 점검에서 확인해 주세요.</p>
      <ol>{draft.adjustment.order.map(id=>draft.adjustment!.changes.find(change=>change.id===id)!).map(change=><li key={change.id}>{placeLabel(change.id, change.name)}<span>{change.fromDate===change.date ? change.date.slice(5) : `${change.fromDate.slice(5)} · ${change.date.slice(5)}`} · 체류 유지 · 휴식 {change.breakBefore} · {change.breakAfter}분</span></li>)}</ol><p>모든 장소와 고정 방문을 유지합니다. 아래에서 적용하기 전까지 현재 일정은 바뀌지 않아요.</p></div>}
    {draft.restOnly && <p>고정 방문을 유지하고 쉬는 시간을 넉넉히 잡아요. 이미 길게 정한 휴식은 줄이지 않습니다.</p>}
    {!!draft.removed?.length && <div><strong>이번에는 쉬어 갈 방문</strong><ul>{draft.removed.map(stop => <li key={stop.place.id}><button type="button" className="naru-proposal-place" onClick={() => onDetails(stop.place)}>{stop.date.slice(5)} · {stop.place.name}</button> — 일정에서 제외</li>)}</ul></div>}
    {draft.weather && <p>날씨 · {draft.weather.days.filter(day => day.date >= draft.start && day.date <= draft.end).map(day => `${day.date.slice(5)} ${day.label}`).join(' / ') || '해당 여행 날짜는 현재 예보 범위 밖이에요'}</p>}
    <div className="naru-proposal-days">{[...new Set(draft.stops.map(stop => stop.date))].map((date, dayIndex) => <section className="naru-proposal-day" key={date} aria-label={`${date} 일정안`}><h4><NightIcon name="calendar" size={18}/>{dayIndex + 1}일차 <span>{date}</span></h4><ol>{draft.stops.filter(stop => stop.date === date).map((stop, index) => <li key={stop.place.id}><span className="naru-stop-number" aria-hidden="true">{index + 1}</span><div><button type="button" className="naru-proposal-place" onClick={() => onDetails(stop.place)}>{safeTourismImageUrl(stop.place.image) && <span className="naru-proposal-photo"><Image unoptimized src={safeTourismImageUrl(stop.place.image)!} alt="" width={96} height={72} loading="lazy"/></span>}<strong>{stop.date.slice(5)} · {stop.place.name}</strong><NightIcon name="info" size={18}/></button>{stop.replaces && <span>기존 장소 교체</span>}<p>{stop.reasons.filter(text => !/한국관광공사에서 조회한 관광지|국문 관광정보/.test(text)).join(' · ')}</p>{stop.unknown.length > 0 && <p className="naru-unconfirmed">방문 전 확인: {stop.unknown.join(' · ')}</p>}</div></li>)}</ol></section>)}</div>
    <details open={!draft.stops.length || unknown > 0}><summary>확인할 내용 {draft.warnings.length}개</summary><ul>{draft.warnings.map(text => <li key={text}>{text}</li>)}</ul></details>
    {draft.stops.length > 0 || draft.restOnly ? <button type="button" disabled={disabled || applied} onClick={onApply}>{applied ? '내 일정에 반영했어요' : disabled ? '여행이 바뀌었어요 · 다시 요청' : unknown ? '미확인 항목을 살펴보고 일정에 반영' : '이 일정으로 반영하기'}</button> : <button type="button" disabled={disabled || applied} onClick={onExplore}>{disabled ? '여행이 바뀌었어요 · 다시 요청' : '필요한 편의를 유지하고 다른 후보 찾기'}</button>}
  </section>;
}
