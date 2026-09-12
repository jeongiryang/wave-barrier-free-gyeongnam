'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { accountTripPayload } from '../../lib/account-travel/model.js';
import { travelRequest } from './client';
import type { AccountTripPayload } from './types';
import type { Place } from '../planner/types';
import { emptyTrip, THEMES_KEY } from '../../lib/current-trip-storage.js';
import { replaceTripWithBackup } from '../../lib/trip-import.js';
import { Spinner } from '../../components/LoadingState';

export default function OpenTripInPlanner({ id, payload: input }: { id: string; payload: AccountTripPayload }) {
  const router = useRouter();
  const lock = useRef(false), mounted = useRef(true);
  const latest = useRef({ id, input });
  useEffect(() => { latest.current = { id, input }; }, [id, input]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  return <div className="open-trip-in-planner"><button type="button" className="primary" disabled={busy} onClick={async () => {
    if (lock.current) return; lock.current = true; setBusy(true); setNotice('');
    try {
      const payload = accountTripPayload(input);
      const data = await travelRequest<{ places: Place[]; missing: number }>(`/${id}/places`, {});
      if (!mounted.current) return;
      if (latest.current.id !== id || JSON.stringify(accountTripPayload(latest.current.input)) !== JSON.stringify(payload)) {
        setNotice('여행을 여는 동안 일정이 수정됐어요. 변경한 내용을 확인하고 다시 열어 주세요.');
        return;
      }
      const places = payload.placeIds.map(id => data.places.find(place => place.id === id) || { id, name: `이름 확인이 필요한 장소 (${id})`, city: payload.region, source: '' });
      replaceTripWithBackup(window.localStorage, { ...emptyTrip(payload.region, payload.travelStart, payload.travelEnd), [THEMES_KEY]: JSON.stringify(payload.themes),
        'wave-saved-places': JSON.stringify(payload.placeIds), 'wave-saved-place-catalog-v1': JSON.stringify(places), 'wave-trip-order-v1': JSON.stringify({ mode: 'manual', ids: payload.placeIds }),
        'wave-trip-schedule-v1': JSON.stringify({ ...payload }),
      });
      router.push('/planner?from=account#itinerary');
    } catch (error) { if (!mounted.current) return; setNotice(error instanceof Error && /[가-힣]/.test(error.message) ? error.message : '여행을 열지 못했어요. 저장한 원본과 현재 일정은 유지됩니다.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }}>{busy ? <><Spinner />여행을 열고 있어요</> : '지도·나루와 이어서 편집 →'}</button><p role="status">{notice}</p><small>현재 만들던 다른 여행은 이 기기의 여행집에 보관합니다. 계정 원본은 유지돼요.</small></div>;
}
