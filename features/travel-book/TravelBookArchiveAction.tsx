"use client";
import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Spinner } from '../../components/LoadingState';
import { useHydratedSession } from '../auth/hooks/useHydratedSession';
import { accountTripPayload, bookToAccountTrip } from '../../lib/account-travel/model.js';
import { ensureTripIdentity, readTripIdentity, writeTripIdentity, type TripIdentity } from '../../lib/trip-identity.js';
import { createTravelBookSnapshot, sanitizeTravelBooks, upsertTravelBook, TRAVEL_BOOK_STORAGE_KEY, TRAVEL_BOOK_MAX_ITEMS, type TravelBookInput } from '../../lib/travel-book.js';
import { AccountTravelError, travelRequest } from '../account-travel/client';
import type { AccountTrip } from '../account-travel/types';
import { assertTripStorageOwner } from '../../lib/current-trip-storage.js';

type Props = TravelBookInput & { compact?: boolean };
function bookScheduleKey(book: NonNullable<ReturnType<typeof createTravelBookSnapshot>>) {
  return JSON.stringify({ region: book.region, themes: book.themes, profiles: book.profiles, guidancePreferences: book.guidancePreferences, places: book.places.map(place => place.id),
    travelStart: book.travelStart, travelEnd: book.travelEnd, dayStartTime: book.dayStartTime, travelMode: book.travelMode,
    scheduleAssignments: book.scheduleAssignments, visitMinutesByPlaceId: book.visitMinutesByPlaceId,
    fixedVisits: book.fixedVisits, dayDeadlines: book.dayDeadlines, comfort: book.comfort,
    breakMinutesByPlaceId: book.breakMinutesByPlaceId, restPurposeByPlaceId: book.restPurposeByPlaceId });
}
export default function TravelBookArchiveAction(input: Props) {
  const { data, isPending } = useHydratedSession();
  const userId = data?.user?.id || '';
  const [identity, setIdentity] = useState<TripIdentity | null>(null);
  const [failureStatus, setFailureStatus] = useState(0);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [failed, setFailed] = useState(false);
  const lock = useRef(false), mounted = useRef(true), lastSaved = useRef(''), automaticScope = useRef('');
  const attempt = useRef({ tripId: '', id: '' });
  const inputKey = JSON.stringify({ ...input, compact: undefined, places: input.places.map(place => place.id) });
  const current = useRef({ input, inputKey, userId });
  useLayoutEffect(() => { current.current = { input, inputKey, userId }; }, [input, inputKey, userId]);
  useEffect(() => {
    mounted.current = true;
    const frame = requestAnimationFrame(() => { try { setIdentity(ensureTripIdentity(window.localStorage)); } catch { setFailed(true); setNotice('기기의 저장 공간을 사용할 수 없어요.'); } });
    return () => { mounted.current = false; cancelAnimationFrame(frame); };
  }, []);
  const saveRef = useRef<(automatic?: boolean) => Promise<void>>(async () => {});
  async function save(automatic = false, copy = false) {
    if (lock.current || !identity || isPending) return;
    try { assertTripStorageOwner(window.localStorage); }
    catch (error) { setFailed(true); setNotice(error instanceof Error ? error.message : '현재 여행을 확인해 주세요.'); return; }
    const base = readTripIdentity(window.localStorage);
    if (!base || base.id !== identity.id) { setFailed(true); setNotice('다른 여행이 열렸어요. 새로고침해서 현재 여행을 확인해 주세요.'); return; }
    const captured = current.current;
    const isCurrent = () => {
      const active = readTripIdentity(localStorage);
      return mounted.current && active?.id === base.id && current.current.userId === captured.userId
        && JSON.stringify(active.binding) === JSON.stringify(base.binding);
    };
    const useAccount = automatic ? base.binding?.kind === 'account' : Boolean(userId);
    if (automatic && useAccount && (base.binding?.kind !== 'account' || base.binding.userId !== userId || base.binding.role !== 'owner')) return;
    const book = createTravelBookSnapshot({ ...captured.input, tripId: base.id, identity: base, id: base.binding?.kind === 'local' ? base.binding.id : `book-${base.id}` });
    if (!book) { setFailed(true); setNotice('저장할 날짜와 장소를 확인해 주세요.'); return; }
    lock.current = true; setBusy(true); setFailed(false); setFailureStatus(0);
    try {
      let binding: TripIdentity['binding'];
      let unchanged = false;
      if (useAccount) {
        const attemptKey = `${base.id}:${copy ? 'copy' : 'save'}`;
        if (attempt.current.tripId !== attemptKey) attempt.current = { tripId: attemptKey, id: crypto.randomUUID() };
        const bound = !copy && base.binding?.kind === 'account' && base.binding.userId === userId && base.binding.role === 'owner' ? base.binding : null;
        const sourceBinding = base.binding?.kind === 'account' && base.binding.userId === userId ? base.binding : null;
        const source = sourceBinding ? await travelRequest<AccountTrip>(`/${sourceBinding.id}`) : null;
        assertTripStorageOwner(localStorage);
        if (!isCurrent()) return;
        if (current.current.inputKey !== captured.inputKey) return;
        const payload = { ...bookToAccountTrip(book), ...(source ? { title: source.payload.title, note: source.payload.note, status: source.payload.status } : {}) };
        unchanged = Boolean(automatic && bound && source && JSON.stringify(payload) === JSON.stringify(accountTripPayload(source.payload)));
        if (unchanged) binding = base.binding;
        else {
          assertTripStorageOwner(localStorage);
          const result = await travelRequest<AccountTrip>(bound ? `/${bound.id}` : '', bound ? { revision: bound.revision, payload } : { id: attempt.current.id, payload });
          binding = { kind: 'account', id: result.id, userId, revision: result.revision, role: result.role };
        }
      } else {
        const books = sanitizeTravelBooks(JSON.parse(localStorage.getItem(TRAVEL_BOOK_STORAGE_KEY) || '[]'));
        const previous = books.find(item => item.tripId === base.id || base.binding?.kind === 'local' && item.id === base.binding.id);
        if (automatic && !previous) throw new Error('저장한 여행이 삭제됐어요. 현재 일정을 확인한 뒤 다시 저장해 주세요.');
        if (books.length >= TRAVEL_BOOK_MAX_ITEMS && !previous) throw new Error('저장한 여행이 20개예요. 내 여행에서 정리한 뒤 저장해 주세요.');
        unchanged = Boolean(automatic && previous && bookScheduleKey(previous) === bookScheduleKey(book));
        assertTripStorageOwner(localStorage);
        if (!isCurrent()) return;
        if (!unchanged) localStorage.setItem(TRAVEL_BOOK_STORAGE_KEY, JSON.stringify(upsertTravelBook(books, { ...book, title: previous?.title || book.title })));
        binding = { kind: 'local', id: book.id };
      }
      const active = readTripIdentity(localStorage);
      if (!active || !isCurrent()) return;
      const next = unchanged ? active : writeTripIdentity(localStorage, { ...active, binding });
      setIdentity(next);
      automaticScope.current = `${next.id}:${JSON.stringify(next.binding)}`;
      lastSaved.current = captured.inputKey;
      if (!unchanged) setNotice(useAccount ? '내 여행에 저장했어요. 이후 변경도 자동으로 저장돼요.' : '이 기기의 내 여행에 저장했어요. 이후 변경도 자동으로 저장돼요.');
    } catch (error) {
      if (mounted.current) { setFailureStatus(error instanceof AccountTravelError ? error.status : 0); setFailed(true); setNotice(error instanceof Error ? error.message : '저장하지 못했어요. 수정한 일정은 이 기기에 남아 있어요.'); }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  useLayoutEffect(() => { saveRef.current = save; });
  useEffect(() => {
    if (!identity?.binding || isPending || failed || busy || lastSaved.current === inputKey) return;
    const scope = `${identity.id}:${JSON.stringify(identity.binding)}`;
    // Opening a saved trip establishes the local baseline. Network writes start
    // only after a later planner edit, never merely because legacy data gained
    // a local-only facility preference during restoration.
    if (automaticScope.current !== scope) {
      automaticScope.current = scope;
      lastSaved.current = inputKey;
      return;
    }
    const timer = setTimeout(() => void saveRef.current(true), 900);
    return () => clearTimeout(timer);
  }, [identity, inputKey, isPending, userId, failed, busy]);
  return <div lang="ko" className="simple-save-control" data-planner-tool="save"><button type="button" className="primary" disabled={!identity || isPending || busy || !input.places.length} onClick={() => void save()}>{busy ? <><Spinner />저장 중</> : failed ? '저장 다시 시도' : identity?.binding?.kind === 'account' && identity.binding.role === 'member' ? '내 여행에 사본 저장' : '내 여행에 저장'}</button>{identity?.binding && <Link href={identity.binding.kind === 'account' ? `/my-trips/${identity.binding.id}` : '/travel-book'}>저장한 여행</Link>}{notice && <p role={failed ? 'alert' : 'status'}>{notice}{failed && failureStatus === 401 && <Link href="/login?next=%2Fplanner">다시 로그인</Link>}{failed && failureStatus === 409 && <button type="button" disabled={busy} onClick={() => void save(false, true)}>현재 일정을 사본으로 저장</button>}</p>}</div>;
}
