
import NightIcon from '../../../components/NightIcon';
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
  return <aside className="naru-workspace-sidebar naru-trip-strip" aria-label="함께 준비하는 여행">
    <div className="naru-trip-strip-heading">
      <button type="button" onClick={() => props.onTool('conditions')}>{draft?.region || props.region || '지역 고르기'}</button>
      <button type="button" onClick={() => props.onTool('dates')}>{draft ? `${draft.start.slice(5)}${draft.end !== draft.start ? ` — ${draft.end.slice(5)}` : ' · 당일'}` : props.dates.replace(/\d{4}-/g, '')}</button>
      {props.companion && <span>{props.companion}</span>}
      {(draft || places.length > 0) && <button type="button" onClick={draft ? props.onResult : () => props.onTool('itinerary')}>{draft ? `제안 ${draft.restOnly ? places.length - (draft.removed?.length || 0) : draft.stops.length}곳 보기` : `내 일정 ${places.length}곳 보기`}</button>}
    </div>
    <details className="naru-trip-strip-details"><summary>여행 조건과 빠른 도구{props.facilities.length > 0 && ` · 편의 ${props.facilities.length}개`}</summary>
    <dl className="naru-workspace-summary">
      <div><dt>지역</dt><dd>{draft?.region || props.region || '아직 정하지 않았어요'}</dd></div>
      <div><dt>동행</dt><dd>{props.companion || '아직 정하지 않았어요'}</dd></div>
      <div><dt>여행 기간</dt><dd>{draft ? `${draft.start}${draft.end !== draft.start ? ` — ${draft.end}` : ' · 당일'}` : props.dates}</dd></div>
      {!!props.facilities.length && <div><dt>필요한 편의</dt><dd>{props.facilities.join(' · ')}</dd></div>}
    </dl>
    <div className="naru-workspace-actions" aria-label="빠른 도구">
      <button type="button" disabled={props.busy} onClick={props.onPhoto}>사진에서 정보 읽기 </button>
      <button type="button" disabled={props.busy} onClick={props.onReview}>내 일정 점검 </button>
      <button type="button" onClick={() => props.onTool('facilities')}>편의시설 선택 </button>
      <button type="button" onClick={() => props.onTool('places')} data-icon-action="" title="일정에 담기"><NightIcon name="plus" size={20}/><span className="sr-only">일정에 담기</span></button>
    </div></details>
    {props.activity.phase === 'warning' && !props.busy && props.activity.text && <p className="naru-trip-strip-warning" role="status">{props.activity.text}</p>}
  </aside>;
}
