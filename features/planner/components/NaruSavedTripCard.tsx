import Image from 'next/image';
import type { TravelBook } from '../../../lib/travel-book.js';
import type { NaruWorkspace } from '../../../lib/naru-workspaces.js';

export default function NaruSavedTripCard({ workspace, book }: { workspace?: NaruWorkspace; book?: TravelBook }) {
  const cover = book?.places.find(place => place.image);
  return <div className="naru-saved-trip-card">
    <div className="naru-saved-trip-cover">{cover ? <Image src={cover.image} alt={cover.name} fill unoptimized sizes="400px" /> : <span aria-hidden="true">🧳</span>}<span className="naru-saved-trip-region">{book?.region || '나루와 준비한 여행'}</span></div>
    <div className="naru-saved-trip-copy"><h3>{workspace?.title || book?.title}</h3>
      <p>🗓 {book?.travelStart ? `${book.travelStart}${book.travelEnd && book.travelEnd !== book.travelStart ? ` ~ ${book.travelEnd}` : ''}` : '날짜 미정'}{book ? ` · ${book.places.length}곳` : ''}</p>
      {book && <ol>{book.places.slice(0, 3).map(place => <li key={place.id}><span>{place.name}</span>{book.scheduleAssignments[place.id] && <small>{book.scheduleAssignments[place.id]}</small>}</li>)}</ol>}
      {book && book.places.length > 3 && <small>외 {book.places.length - 3}곳</small>}
      {!book && <p>저장된 대화를 다시 열어 여행 준비를 확인해요.</p>}
      <small>{workspace ? `대화 ${workspace.messages.length}개 · ` : ''}{new Date(workspace?.updatedAt || book?.updatedAt || '').toLocaleDateString('ko-KR')} 저장</small>
    </div>
  </div>;
}
