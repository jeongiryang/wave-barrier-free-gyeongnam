import type { Place } from '../types';
import PlaceInquiryCard from './PlaceInquiryCard';
import PlaceComparison from './PlaceComparison';

export default function PlannerAssistantPlaceTools({ mode, places, requiredKeys, saved, current, onDetails, onToggle }: {
  mode: string; places: Place[]; requiredKeys: string[]; saved: string[]; current: boolean;
  onDetails: (place: Place) => void; onToggle: (place: Place) => void;
}) {
  if (!places.length) return <p>여행지를 먼저 찾거나 일정에 담아주세요. 그 장소의 문의 카드와 편의 비교를 여기에서 열어드릴게요.</p>;
  if (mode === 'inquiry') return <div className="naru-place-tools">{places.map(place => <article key={place.id}><h3>{place.name}</h3><PlaceInquiryCard place={place} en={false} /></article>)}</div>;
  return <PlaceComparison initialActive places={places} requiredKeys={requiredKeys} saved={saved} current={current} en={false} onToggle={onToggle}>{compare => <div className="naru-place-tools">{places.map(place => <article key={place.id}><h3>{place.name}</h3><button type="button" aria-pressed={compare.ids.includes(place.id)} disabled={!compare.ids.includes(place.id) && compare.ids.length >= 3} onClick={() => compare.toggle(place.id)}>{compare.ids.includes(place.id) ? '비교에 선택됨' : '이 장소 비교하기'}</button><button type="button" onClick={() => onDetails(place)}>이용 정보</button></article>)}</div>}</PlaceComparison>;
}
