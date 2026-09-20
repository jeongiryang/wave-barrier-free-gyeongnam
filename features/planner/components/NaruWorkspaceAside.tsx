import type { NaruJourney } from '../../../lib/naru-journey.js';

type Props = {
  region: string; dates: string; companion: string; facilities: string[];
  busy: boolean; activity: { phase: string; text: string };
  places: { id: string; name: string }[]; draft?: NaruJourney;
  onPrompt: (text: string) => void; onTool: (tool: string) => void;
  onReview: () => void; onPhoto: () => void; onResult: () => void;
};

export default function NaruWorkspaceAside(props: Props) {
  const { draft, places } = props;
  return <aside className="naru-workspace-sidebar" aria-label="함께 준비하는 여행">
    <h2>함께 준비하는 여행</h2>
    <p>대화에서 정한 조건과 일정을 함께 살펴보세요.</p>
    <dl className="naru-workspace-summary">
      <div><dt>지역</dt><dd>{draft?.region || props.region || '아직 정하지 않았어요'}</dd></div>
      <div><dt>동행</dt><dd>{props.companion || '아직 정하지 않았어요'}</dd></div>
      <div><dt>여행 기간</dt><dd>{draft ? `${draft.start}${draft.end !== draft.start ? ` — ${draft.end}` : ' · 당일'}` : props.dates}</dd></div>
      {!!props.facilities.length && <div><dt>필요한 편의</dt><dd>{props.facilities.join(' · ')}</dd></div>}
    </dl>
    {props.activity.text && <section className="naru-workspace-progress" aria-label="여행 준비 진행 상태" aria-busy={props.busy}>
      <strong>{props.busy ? '여행안을 준비하고 있어요' : props.activity.phase === 'warning' ? '확인이 필요해요' : '작업 상태'}</strong>
      <p>{props.activity.text}</p>
    </section>}
    {(draft || places.length > 0) && <section className="naru-workspace-result" aria-label="여행 결과 요약">
      <h3>{draft ? '제안한 일정' : '현재 내 일정'}</h3>
      {draft && <p>현재 {places.length}곳 → 제안 {draft.stops.length}곳 · 적용 전</p>}
      <ol>{(draft ? draft.stops.map(stop => ({ id: stop.place.id, name: stop.place.name, detail: `${stop.date.slice(5)} · 체류 ${stop.minutes}분 · 휴식 ${stop.breakMinutes}분` })) : places.map(place => ({ ...place, detail: '' }))).map(place => <li key={place.id}><strong>{place.name}</strong>{place.detail && <small>{place.detail}</small>}</li>)}</ol>
      <button type="button" onClick={draft ? props.onResult : () => props.onTool('itinerary')}>{draft ? '변경안과 확인할 사항 보기' : '내 일정 자세히 보기'} →</button>
    </section>}
    <section className="naru-workspace-actions" aria-label="빠른 도구">
      <h3>빠른 도구</h3>
      <button type="button" disabled={props.busy} onClick={props.onPhoto}>사진에서 정보 읽기 <span aria-hidden="true">›</span></button>
      <button type="button" disabled={props.busy} onClick={props.onReview}>내 일정 점검 <span aria-hidden="true">›</span></button>
      <button type="button" onClick={() => props.onTool('facilities')}>편의시설 선택 <span aria-hidden="true">›</span></button>
      <button type="button" onClick={() => props.onTool('places')}>일정에 담기 <span aria-hidden="true">›</span></button>
    </section>
  </aside>;
}
