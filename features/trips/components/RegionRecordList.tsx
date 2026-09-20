'use client';
import { useEffect, useMemo, useState } from 'react';
import type { TravelBook } from '../../../lib/travel-book.js';
import { ON_TRIP_KEY } from '../../../lib/on-trip.js';
import { regionRecords } from '../../../lib/region-record.js';
import { landingRegions } from '../../landing/content';

type StoredProgress = { identity?: string; value?: { marks?: Record<string, { state?: string; at?: string }> } };
function completedTrips(books: TravelBook[], raw: string) {
  let records: StoredProgress[] = [];
  try { const parsed = JSON.parse(raw || '[]'); if (Array.isArray(parsed)) records = parsed; } catch { return []; }
  return books.flatMap(book => {
    const places = new Map(book.places.map(place => [place.id, place]));
    return records.flatMap(record => {
      const [day, rawIds = ''] = String(record.identity || '').split('|');
      const identityIds = rawIds.split(',').filter(Boolean);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < book.travelStart || day > book.travelEnd || !identityIds.some(id => places.has(id))) return [];
      return Object.entries(record.value?.marks || {}).flatMap(([id, mark]) => {
        const place = places.get(id), completedAt = mark?.at?.slice(0, 10);
        return place?.city && mark?.state === 'done' && /^\d{4}-\d{2}-\d{2}$/.test(completedAt || '') ? [{ region: place.city, completedAt: completedAt! }] : [];
      });
    });
  });
}
function Check() { return <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M2.5 8.5l3.2 3.2 7.8-8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>; }
export default function RegionRecordList({ books }: { books: TravelBook[] }) {
  const [raw, setRaw] = useState('[]');
  useEffect(() => { const read = () => { try { setRaw(localStorage.getItem(ON_TRIP_KEY) || '[]'); } catch { setRaw('[]'); } }; read(); window.addEventListener('storage', read); return () => window.removeEventListener('storage', read); }, []);
  const records = useMemo(() => regionRecords(completedTrips(books, raw), landingRegions.map(region => region.name)), [books, raw]);
  const count = records.filter(record => record.visited).length;
  return <section className="region-record-list" aria-labelledby="region-record-title"><header><div><p>내 여행 기록</p><h2 id="region-record-title">경남 지역 기록</h2></div><strong>18곳 중 {count}곳을 다녀왔어요.</strong></header><p>일정에서 직접 ‘다녀왔어요’를 누른 기록만 표시해요. 여행을 지우면 이 목록의 표시도 사라져요.</p><ul>{records.map(record => <li key={record.region} data-visited={record.visited}><span aria-hidden="true">{record.visited ? <Check /> : '○'}</span><strong>{record.region}</strong><span>{record.visited ? '다녀옴' : '아직'}</span>{record.firstRecordedOn && <time dateTime={record.firstRecordedOn}>처음 기록 {record.firstRecordedOn}</time>}</li>)}</ul></section>;
}
