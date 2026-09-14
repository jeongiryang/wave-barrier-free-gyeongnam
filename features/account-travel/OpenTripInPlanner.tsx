'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { accountTripPayload } from '../../lib/account-travel/model.js';
import { travelRequest } from './client';
import type { AccountTripPayload } from './types';
import type { Place } from '../planner/types';
import { emptyTrip, THEMES_KEY, TRIP_IDENTITY_KEY, FACILITIES_KEY, GUIDANCE_KEY } from '../../lib/current-trip-storage.js';
import { replaceTripWithBackup } from '../../lib/trip-import.js';
import { useHydratedSession } from '../auth/hooks/useHydratedSession';
import { newTripIdentity } from '../../lib/trip-identity.js';
import { Spinner } from '../../components/LoadingState';
import { getTabStorage } from '../../lib/session-storage.js';
import { readSessionProfiles } from '../../lib/session-travel-profiles.js';

export default function OpenTripInPlanner({ id, payload: input, revision, role }: { id: string; payload: AccountTripPayload; revision: number; role: 'owner'|'member' }) {
  const { data: session } = useHydratedSession();
  const lock = useRef(false), mounted = useRef(true);
  const latest = useRef({ id, input, revision, role, userId: session?.user?.id });
  useLayoutEffect(() => { latest.current = { id, input, revision, role, userId: session?.user?.id }; }, [id, input, revision, role, session?.user?.id]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  return <div className="open-trip-in-planner"><button type="button" className="primary" disabled={busy} onClick={async () => {
    if (lock.current || !session?.user?.id) return; lock.current = true; setBusy(true); setNotice('');
    try {
      const payload = accountTripPayload(input);
      const data = await travelRequest<{ places: Place[]; missing: number }>(`/${id}/places`, {});
      if (!mounted.current) return;
      if (latest.current.id !== id || latest.current.revision !== revision || latest.current.role !== role || latest.current.userId !== session.user.id || JSON.stringify(accountTripPayload(latest.current.input)) !== JSON.stringify(payload)) {
        setNotice('여행을 여는 동안 일정이 수정됐어요. 변경한 내용을 확인하고 다시 열어 주세요.');
        return;
      }
      // Trips saved before facility choices became part of the account payload
      // inherit this tab's explicit choices. A present `profiles` field, including
      // an empty array, always wins so a deliberate clear is respected.
      const profiles = Object.hasOwn(input, 'profiles') ? payload.profiles : readSessionProfiles(getTabStorage());
      const places = payload.placeIds.map(id => data.places.find(place => place.id === id) || { id, name: `이름 확인이 필요한 장소 (${id})`, city: payload.region, source: '' });
      replaceTripWithBackup(window.localStorage, { ...emptyTrip(payload.region, payload.travelStart, payload.travelEnd), [THEMES_KEY]: JSON.stringify(payload.themes),
        [FACILITIES_KEY]: JSON.stringify(profiles), [GUIDANCE_KEY]: JSON.stringify(payload.guidancePreferences || {}),
        [TRIP_IDENTITY_KEY]: JSON.stringify({ ...newTripIdentity(), id, binding: { kind: 'account', id, revision, role, userId: session.user.id } }),
        'wave-saved-places': JSON.stringify(payload.placeIds), 'wave-saved-place-catalog-v1': JSON.stringify(places), 'wave-trip-order-v1': JSON.stringify({ mode: 'manual', ids: payload.placeIds }),
        'wave-trip-schedule-v1': JSON.stringify(payload),
      });
      window.location.assign('/planner?from=account#itinerary');
    } catch (error) { if (!mounted.current) return; setNotice(error instanceof Error && /[가-힣]/.test(error.message) ? error.message : '여행을 열지 못했어요. 저장한 원본과 현재 일정은 유지됩니다.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }}>{busy ? <><Spinner />여행을 열고 있어요</> : '여행 설계에서 열기'}</button><p role="status">{notice}</p><small>현재 만들던 다른 여행은 이 기기의 여행집에 보관합니다. 계정 원본은 유지돼요.</small></div>;
}
