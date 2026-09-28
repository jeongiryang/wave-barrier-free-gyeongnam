'use client';
import { useEffect, useMemo, useState } from 'react';
import type { TravelBook } from '../../../lib/travel-book.js';
import { ON_TRIP_KEY } from '../../../lib/on-trip.js';
import { evidenceDate } from '../../../lib/evidence-date.js';
import { regionRecords } from '../../../lib/region-record.js';
import { landingRegions } from '../../landing/content';
import { regionShowcasePhotos } from '../../landing/region-showcase-photos';
import Link from 'next/link';

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
        const place = places.get(id), completedAt = evidenceDate(mark?.at);
        return place?.city && mark?.state === 'done' && /^\d{4}-\d{2}-\d{2}$/.test(completedAt || '') ? [{ region: place.city, completedAt: completedAt! }] : [];
      });
    });
  });
}
function Check() { return <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M2.5 8.5l3.2 3.2 7.8-8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>; }
export default function RegionRecordList({ books }: { books: TravelBook[] }) {
  const [raw, setRaw] = useState('[]');
  const preview = process.env.NODE_ENV === "development";
  useEffect(() => { const read = () => { try { setRaw(localStorage.getItem(ON_TRIP_KEY) || '[]'); } catch { setRaw('[]'); } }; read(); window.addEventListener('storage', read); return () => window.removeEventListener('storage', read); }, []);
  const records = useMemo(() => regionRecords(completedTrips(books, raw), landingRegions.map(region => region.name)), [books, raw]);
  const visibleRecords = preview ? records.map(record => ["통영", "거제", "남해"].includes(record.region) ? { ...record, visited: true } : record) : records;
  const count = visibleRecords.filter(record => record.visited).length;
  return <section className="region-record-list" aria-label="나의 경남 발자취"><header><div><p>나의 경남 발자취</p></div><strong><b>{count}</b> / 18</strong></header><progress value={count} max={18} aria-label={`18곳 중 ${count}곳 방문`}/><ul>{visibleRecords.map(record => <li key={record.region} data-visited={record.visited}><Link className="region-record-photo" href={`/planner?region=${encodeURIComponent(record.region)}`} aria-label={`${record.region}${record.visited ? ", 방문 완료" : ""}, 여행지 보기`}>{regionShowcasePhotos[record.region]?.image && <img src={regionShowcasePhotos[record.region].image} alt="" loading="lazy" onError={event => { event.currentTarget.style.visibility = "hidden"; }} />}<strong>{record.region}</strong>{record.visited && <span className="region-record-mark" aria-hidden="true"><Check /></span>}</Link><span className="sr-only">{record.visited ? '다녀옴' : '아직'}</span>{record.firstRecordedOn && <time dateTime={record.firstRecordedOn}>처음 기록 {record.firstRecordedOn}</time>}</li>)}</ul><Link className="region-record-policy" href="/policies#travel-records">정보 이용 안내</Link></section>;
}
