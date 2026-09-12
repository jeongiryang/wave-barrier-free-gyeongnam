import type { NaruJourney } from '../../../lib/naru-journey.js';

export default function NaruJourneyProposal({ draft, disabled, applied, onApply, onExplore }: { draft: NaruJourney; disabled: boolean; applied: boolean; onApply: () => void; onExplore: () => void }) {
  if (draft.outcome?.kind === 'unchanged') return <section className="naru-journey-proposal" aria-label="나루의 일정 확인 결과">
    <header><strong>현재 일정을 그대로 유지해요</strong><small>{draft.outcome.kept.length}곳 유지</small></header>
    <p>공식 소개에서 실내 공간을 확인했어요. 장소·날짜·방문 시간·휴식·이동수단은 바꾸지 않았어요.</p>
    <ol>{draft.outcome.kept.map(stop => <li key={stop.id}><strong>{stop.date.slice(5)} · {stop.name}</strong><span>기존 방문 유지</span></li>)}</ol>
    {draft.warnings.length > 0 && <details open><summary>방문 전 확인</summary><ul>{draft.warnings.map(text => <li key={text}>{text}</li>)}</ul></details>}
    {disabled && <p>여행 조건이 달라졌다면 현재 일정에서 다시 확인해 주세요.</p>}
  </section>;
  const unknown = draft.stops.reduce((sum, stop) => sum + stop.unknown.length, 0);
  return <section className="naru-journey-proposal" aria-label="나루의 실제 일정안">
    <header><strong>{draft.region} · {draft.start.slice(5)}{draft.end !== draft.start && ` – ${draft.end.slice(5)}`} 일정안</strong><small>{draft.restOnly ? '방문 수와 휴식 조정' : `${draft.stops.length}곳 · ${draft.relaxed ? '쉬엄쉬엄' : '가볍게 둘러보기'}`}</small></header>
    {draft.restOnly && <p>고정 방문을 유지하고 쉬는 시간을 넉넉히 잡아요. 이미 길게 정한 휴식은 줄이지 않습니다.</p>}
    {!!draft.removed?.length && <div><strong>이번에는 쉬어 갈 방문</strong><ul>{draft.removed.map(stop => <li key={stop.place.id}>{stop.date.slice(5)} · {stop.place.name} — 일정에서 제외</li>)}</ul></div>}
    {draft.weather && <p>날씨 · {draft.weather.days.filter(day => day.date >= draft.start && day.date <= draft.end).map(day => `${day.date.slice(5)} ${day.label}`).join(' / ') || '예보가 나오면 다시 확인해요'}</p>}
    <ol>{draft.stops.map(stop => <li key={stop.place.id}><strong>{stop.date.slice(5)} · {stop.place.name}</strong><span>{stop.replaces ? '기존 장소 교체 · ' : ''}체류 {stop.minutes}분 · 휴식 {stop.breakMinutes}분 제안</span><p>{stop.reasons.join(' · ')}</p>{stop.unknown.length > 0 && <p className="naru-unconfirmed">방문 전 확인: {stop.unknown.join(' · ')}</p>}<small>{stop.place.source} · {stop.place.checkedAt?.slice(0, 10) || '조회 시각 미제공'}</small></li>)}</ol>
    <details open={!draft.stops.length || unknown > 0}><summary>확인할 내용 {draft.warnings.length}개</summary><ul>{draft.warnings.map(text => <li key={text}>{text}</li>)}</ul></details>
    {draft.stops.length > 0 || draft.restOnly ? <button type="button" disabled={disabled || applied} onClick={onApply}>{applied ? '내 일정에 반영했어요' : disabled ? '여행이 바뀌었어요 · 다시 요청' : unknown ? '미확인 항목을 살펴보고 일정에 반영' : '이 일정으로 반영하기'}</button> : <button type="button" disabled={disabled || applied} onClick={onExplore}>{disabled ? '여행이 바뀌었어요 · 다시 요청' : '필요한 편의를 유지하고 다른 후보 찾기'}</button>}
  </section>;
}
