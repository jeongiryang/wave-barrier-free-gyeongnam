import Image from 'next/image';
import type { Place } from '../types';

export default function NaruPreparationSummary({ region, places, count, start, end, transport, onTool, onPlace }: { region: string; places: Place[]; count: number; start: string; end: string; transport: string; onTool: (tool: string) => void; onPlace: (place: Place) => void }) {
  return <section className="naru-preparation" aria-label="지금까지 준비한 여행">
    <header><div><span className="naru-preparation-eyebrow">지금까지 준비한 여행</span><h3>{region || '나의'} 여행</h3></div><span className="naru-preparation-count">담은 장소 {count}곳</span></header>
    <div className="naru-preparation-facts">
      <button type="button" onClick={() => onTool('dates')}><span aria-hidden="true">🗓</span><span><small>여행 날짜</small><strong>{start ? `${start}${end && end !== start ? ` ~ ${end}` : ''}` : '아직 정하지 않았어요'}</strong></span></button>
      <button type="button" onClick={() => onTool('transport')}><span aria-hidden="true">🧭</span><span><small>선택한 이동 방법</small><strong>{transport}</strong></span></button>
    </div>
    <div className="naru-preparation-places">{places.slice(0, 3).map(place => <button key={place.id} type="button" onClick={() => onPlace(place)}>
      <span className="naru-preparation-photo">{place.image ? <Image src={place.image} alt="" fill unoptimized sizes="180px" /> : <span aria-hidden="true">📍</span>}</span><span><strong>{place.name}</strong><small>{place.city || region}</small></span>
    </button>)}</div>
    <footer>{count > 3 && <span>외 {count - 3}곳</span>}<button type="button" onClick={() => onTool(start ? 'itinerary' : 'dates')}>{start ? '담은 일정 보기' : '다음: 여행 날짜 정하기'} <span aria-hidden="true">→</span></button></footer>
  </section>;
}
