'use client';
import { compareTrips, type TripSummary } from '../../../lib/trip-compare.js';
import { usePlaceDialogFocus } from '../../planner/hooks/usePlaceDialogFocus';

export default function TripCompareDialog({ left, right, onClose, onStart }: { left: TripSummary; right: TripSummary; onClose: () => void; onStart: (suggestion: { region: string; facilityKeys: string[] }) => void }) {
  const ref = usePlaceDialogFocus(true, onClose);
  const rows = compareTrips(left, right);
  return <dialog ref={ref} className="region-change-dialog trip-compare-dialog" aria-labelledby="trip-compare-title">
    <header><h2 id="trip-compare-title" tabIndex={-1}>내 여행 두 개 견주어 보기</h2><button type="button" onClick={onClose} aria-label="여행 비교 닫기">×</button></header>
    <p>직접 만든 일정의 사실만 비교해요. 어느 여행이 더 좋다는 점수나 추천은 만들지 않아요.</p>
    <table><caption className="sr-only">{left.title}과 {right.title} 비교</caption><thead><tr><th scope="col">항목</th><th scope="col">{left.title}</th><th scope="col">{right.title}</th></tr></thead><tbody>{rows.map(row => <tr key={row.label} data-different={!row.same}><th scope="row">{row.label}<small>{row.same ? '같음' : '다름'}</small></th><td>{row.left}</td><td>{row.right}</td></tr>)}</tbody></table>
    <div className="trip-compare-actions"><button type="button" onClick={() => onStart({ region: left.region, facilityKeys: left.facilityKeys })}>{left.title} 조건으로 새 여행 시작하기</button><button type="button" onClick={() => onStart({ region: right.region, facilityKeys: right.facilityKeys })}>{right.title} 조건으로 새 여행 시작하기</button></div>
    <button type="button" onClick={onClose}>닫기</button>
  </dialog>;
}
