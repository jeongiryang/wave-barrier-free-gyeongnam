import type { Place } from "../types";
import { facilityLabel } from "../../../lib/facility-selection.js";

export default function PlaceFacilitySummary({ place, en }: { place: Place; en: boolean }) {
  const items = place.accessibility ?? [];
  if (!items.length && place.facilityLookupState !== 'error') return null;
  return <div className="simple-facility-summary">
    {place.facilityLookupState === 'error' && <p>{en ? 'Facility information could not be loaded.' : '편의정보를 불러오지 못했어요.'}</p>}
    {items.filter(item => item.state === 'negative').map(item => <span className="facility-missing" key={item.key}>{facilityLabel(item.key, en)} {en ? 'unavailable' : '없음'}</span>)}
    {items.filter(item => item.state === 'unknown').map(item => <span className="facility-unknown" key={item.key}>{facilityLabel(item.key, en)} {en ? 'not reported' : '정보 없음'}</span>)}
    {items.filter(item => item.state === 'confirmed').slice(0, 3).map(item => <span key={item.key}><span aria-hidden="true">✓ </span>{facilityLabel(item.key, en)}</span>)}
  </div>;
}
