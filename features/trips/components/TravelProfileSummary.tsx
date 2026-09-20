import { useMemo } from 'react';
import { buildTravelProfile, type TravelProfileEntry } from '../../../lib/travel-profile.js';
import type { TravelBook } from '../../../lib/travel-book.js';

const days = (start: string, end: string) => {
  const first = Date.parse(`${start}T12:00:00Z`), last = Date.parse(`${end}T12:00:00Z`);
  return Number.isFinite(first) && Number.isFinite(last) && last >= first ? Math.floor((last - first) / 86_400_000) + 1 : 0;
};

function FactList({ title, entries, tripCount }: { title: string; entries: TravelProfileEntry[]; tripCount: number }) {
  return <section><h3>{title}</h3>{entries.length ? <ol>{entries.map(entry => <li key={entry.label}><span>{entry.label}</span><strong>{entry.count}개</strong></li>)}</ol> : <p>직접 고른 내용이 아직 없어요.</p>}<small>내가 만든 일정 {tripCount}개를 세어 봤어요.</small></section>;
}

export default function TravelProfileSummary({ books, onStart }: { books: TravelBook[]; onStart: (suggestion: { region: string | null; facilityKeys: string[] }) => void }) {
  const profile = useMemo(() => buildTravelProfile({ trips: books.map(book => ({ id: book.id, region: book.region, dayCount: days(book.travelStart, book.travelEnd), facilityKeys: book.profiles, placeTypeIds: book.places.map(place => place.contentTypeId || '').filter(Boolean) })) }), [books]);
  if (!profile) return null;
  return <section className="travel-profile-summary" aria-labelledby="travel-profile-title">
    <header><div><p>직접 만든 여행만 사용</p><h2 id="travel-profile-title">내 여행 취향 정리</h2></div><span>{profile.tripCount}개 일정</span></header>
    <p>저장한 일정에서 고른 사실을 기기 안에서 세었어요. 실제 방문이나 성격 유형을 뜻하지 않아요.</p>
    <div><FactList title="많이 고른 지역" entries={profile.regions} tripCount={profile.tripCount} /><FactList title="자주 고른 편의" entries={profile.facilities} tripCount={profile.tripCount} /><FactList title="즐겨 담은 장소 종류" entries={profile.placeTypes} tripCount={profile.tripCount} /><FactList title="여행 길이" entries={profile.lengths} tripCount={profile.tripCount} /></div>
    <button type="button" onClick={() => onStart(profile.suggestion)}>이 조건으로 새 여행 시작하기</button>
    <small>지역과 편의 조건만 채워요. 검색하거나 일정을 자동으로 만들지 않으며 설계 화면에서 바로 바꿀 수 있어요.</small>
  </section>;
}
