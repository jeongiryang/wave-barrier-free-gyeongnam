import type { Place } from "../types";
import { facilityLabel } from "../../../lib/facility-selection.js";
import { guideDogLegalNote, guideDogStateText } from "../../../lib/guide-dog-facility.js";

export default function PlaceFacilitySummary({ place, en }: { place: Place; en: boolean }) {
  const items = place.accessibility ?? [];
  if (!items.length && place.facilityLookupState !== 'error') return null;
  // 안내견 동반은 "불가"라고 단정하지 않는 고정 문구로 항상 따로 보여준다. 그래서
  // 아래 일반 항목 목록에서는 제외한다.
  const guideDog = items.find(item => item.key === 'helpdog');
  const rest = items.filter(item => item.key !== 'helpdog');
  return <div className="simple-facility-summary">
    {place.facilityLookupState === 'error' && <p>{en ? 'Facility information could not be loaded.' : '편의정보를 불러오지 못했어요.'}</p>}
    {guideDog && <>
      <span className="access-badge">{guideDogStateText(guideDog.state, en)}</span>
      {guideDog.state !== 'confirmed' && <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>{guideDogLegalNote(en)}</p>}
    </>}
    {rest.filter(item => item.state === 'negative').map(item => <span className="facility-missing" key={item.key}>{facilityLabel(item.key, en)} {en ? 'unavailable' : '없음'}</span>)}
    {rest.filter(item => item.state === 'unknown').map(item => <span className="facility-unknown" key={item.key}>{facilityLabel(item.key, en)} {en ? 'not reported' : '정보 없음'}</span>)}
    {rest.filter(item => item.state === 'confirmed').slice(0, 3).map(item => <span key={item.key}><span aria-hidden="true">✓ </span>{facilityLabel(item.key, en)}</span>)}
  </div>;
}
