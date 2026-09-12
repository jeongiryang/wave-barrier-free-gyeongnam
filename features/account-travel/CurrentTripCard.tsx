'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readTripValue, REGION_KEY } from '../../lib/current-trip-storage.js';
import { readSessionProfiles } from '../../lib/session-travel-profiles.js';
import { getTabStorage } from '../../lib/session-storage.js';
import { profiles } from '../planner/constants';
import NaruAvatar from '../../components/NaruAvatar';

export default function CurrentTripCard() {
  const [current, setCurrent] = useState<{ region: string; start: string; end: string; names: string[]; profiles: string[] } | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => { try {
      const ids = JSON.parse(readTripValue(localStorage, 'wave-saved-places') || '[]'); if (!ids.length) return;
      const catalog = JSON.parse(readTripValue(localStorage, 'wave-saved-place-catalog-v1') || '[]');
      const schedule = JSON.parse(readTripValue(localStorage, 'wave-trip-schedule-v1') || '{}');
      const order = JSON.parse(readTripValue(localStorage, 'wave-trip-order-v1') || '{}');
      const orderedIds: string[] = order.mode === 'manual' && Array.isArray(order.ids) ? [...new Set<string>([...order.ids.filter((id: string) => ids.includes(id)), ...ids])] : ids;
      orderedIds.sort((a, b) => String(schedule.scheduleAssignments?.[a] || schedule.travelStart).localeCompare(String(schedule.scheduleAssignments?.[b] || schedule.travelStart)));
      setCurrent({ region: readTripValue(localStorage, REGION_KEY) || '경남', start: schedule.travelStart, end: schedule.travelEnd, names: orderedIds.map((id: string) => catalog.find((place: { id: string; name: string }) => place.id === id)?.name || '이름 확인이 필요한 장소'), profiles: readSessionProfiles(getTabStorage()) });
    } catch { /* Account trips remain available even when device storage is blocked. */ } });
    return () => cancelAnimationFrame(frame);
  }, []);
  return <section className="current-trip-card"><NaruAvatar large /><div><small>{current ? '이 기기에서 만들던 여행' : '다음 여행의 첫 장면'}</small><h2>{current ? `${current.region}, 이어서 준비할까요?` : '어떤 하루를 보내고 싶나요?'}</h2>{current ? <><p>{current.start} – {current.end} · {current.names.length}곳</p><p>{current.names.slice(0, 3).join(' · ')}{current.names.length > 3 && ' …'}</p>{current.profiles.length > 0 && <p>필요한 편의: {current.profiles.map(id => profiles.find(profile => profile.id === id)?.label).join(' · ')}</p>}</> : <p>아직 정한 것이 없어도 괜찮아요. 나루에게 바라는 여행을 말해보세요.</p>}<div className="travel-book-actions"><Link className="primary" href={current ? '/planner#itinerary' : '/planner?assistant=naru'}>{current ? '만들던 일정 이어가기' : '나루와 여행 만들기'}</Link><Link href="/festivals">날짜에 맞는 축제 찾기 ↗</Link></div></div></section>;
}
