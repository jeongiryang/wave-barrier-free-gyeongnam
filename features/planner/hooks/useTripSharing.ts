"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ensureTripIdentity, readTripIdentity, writeTripIdentity, type TripIdentity } from "../../../lib/trip-identity.js";
import { plannerJson } from "../services/api";
import { sameOriginHttpUrl } from "../../../lib/security/same-origin-url.js";

export interface TripSharingOptions {
  region: string;
  theme: string;
  profiles: string[];
  locale: string;
  travelStart: string;
  travelEnd: string;
  dayStartTime: string;
  travelMode: import("../../../lib/trip-travel-mode.js").TripTravelMode;
  scheduleAssignments: Record<string, string>;
  visitMinutesByPlaceId?: Record<string, number>;
  fixedVisits?: Record<string, import("../../../lib/trip-time-constraints.js").FixedVisit>;
  dayDeadlines?: Record<string, import("../../../lib/trip-time-constraints.js").DayDeadline>;
  breakMinutesByPlaceId?: Record<string, number>;
  restPurposeByPlaceId?: Record<string, import("../../../lib/trip-comfort.js").StopPurpose>;
  selectedPlaceIds: string[];
  originLabel: string;
}

async function hashSnapshot(snapshot: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(snapshot));
  return Array.from(new Uint8Array(digest), item => item.toString(16).padStart(2, '0')).join('');
}
class ChangedSnapshot extends Error {}
export function useTripSharing(options: TripSharingOptions) {
  const snapshot = JSON.stringify({ live: true, selections: {
    region: options.region, theme: options.theme, profiles: [], locale: options.locale,
    travelStart: options.travelStart, travelEnd: options.travelEnd, dayStartTime: options.dayStartTime, travelMode: options.travelMode,
    scheduleAssignments: options.scheduleAssignments, selectedPlaceIds: options.selectedPlaceIds,
    visitMinutesByPlaceId: options.visitMinutesByPlaceId, fixedVisits: options.fixedVisits, dayDeadlines: options.dayDeadlines,
    breakMinutesByPlaceId: options.breakMinutesByPlaceId, restPurposeByPlaceId: options.restPurposeByPlaceId,
  }, origin: { label: '' } });
  type State = 'idle'|'saving'|'done'|'error'|'copy-error';
  const [shareState, setShareState] = useState<State>('idle');
  const [shareNotice, setShareNotice] = useState('');
  const [identity, setIdentity] = useState<TripIdentity | null>(null);
  const [now, setNow] = useState(0);
  const latest = useRef(snapshot), synced = useRef(''), mounted = useRef(true), revoking = useRef(false);
  const pending = useRef<{ snapshot: string; promise: Promise<string> } | null>(null);
  useLayoutEffect(() => { latest.current = snapshot; }, [snapshot]);
  useEffect(() => {
    mounted.current = true;
    const frame = requestAnimationFrame(() => { try { setIdentity(ensureTripIdentity(localStorage)); setNow(Date.now()); } catch { /* Storage notice offers recovery. */ } });
    return () => { mounted.current = false; cancelAnimationFrame(frame); };
  }, []);
  const shareUrl = identity?.share && identity.share.expiresAt > now && typeof window !== 'undefined' ? `${window.location.origin}/trip/${identity.share.id}` : '';
  const ensureShareUrl = useCallback(async () => {
    if (revoking.current) throw new Error('공유 종료를 처리하고 있어요.');
    while (pending.current) {
      if (pending.current.snapshot === snapshot) return pending.current.promise;
      await pending.current.promise.catch(() => {});
    }
    if (latest.current !== snapshot) throw new ChangedSnapshot('일정이 바뀌었어요. 최신 내용을 반영하고 있어요.');
    const base = readTripIdentity(localStorage);
    if (!identity || base?.id !== identity.id) throw new Error('다른 여행이 열렸어요. 현재 여행을 확인해 주세요.');
    if (base.share && synced.current === snapshot && base.share.expiresAt > Date.now()) return `${window.location.origin}/trip/${base.share.id}`;
    const existing = base.share && base.share.expiresAt > Date.now() ? base.share : null;
    const isThisTrip = () => mounted.current && readTripIdentity(localStorage)?.id === base.id;
    setNow(Date.now()); setShareState('saving'); setShareNotice('');
    const request = (async () => {
      const snapshotHash = await hashSnapshot(snapshot);
      if (existing?.snapshotHash === snapshotHash) { synced.current = snapshot; setShareState('idle'); return `${window.location.origin}/trip/${existing.id}`; }
      const data = await plannerJson<{ id: string; url: string; revision: number; expiresAt: number }>(`/api/trips${existing ? `/${existing.id}` : ''}`, { method: 'POST', body: { ...JSON.parse(snapshot), ...(existing ? { revision: existing.revision } : {}) } });
      if (!isThisTrip()) throw new Error('공유를 준비하는 동안 다른 여행이 열렸어요.');
      const url = sameOriginHttpUrl(data.url, window.location.origin);
      if (!url || !/^[a-f\d]{12}$/.test(data.id) || !new URL(url).pathname.endsWith(`/trip/${data.id}`) || !Number.isSafeInteger(data.revision) || data.revision < 1 || !Number.isFinite(data.expiresAt)) throw new Error('공유 링크를 확인하지 못했어요.');
      const active = readTripIdentity(localStorage)!;
      if (JSON.stringify(active.share) !== JSON.stringify(base.share)) throw new Error('다른 곳에서 공유 링크가 바뀌었어요.');
      const next = writeTripIdentity(localStorage, { ...active, share: { id: data.id, revision: data.revision, expiresAt: data.expiresAt, snapshotHash } });
      synced.current = snapshot; setIdentity(next); setShareState('idle');
      if (latest.current !== snapshot) throw new ChangedSnapshot('일정이 바뀌었어요. 최신 내용을 반영하고 있어요.');
      return url;
    })();
    pending.current = { snapshot, promise: request };
    try { return await request; }
    catch (error) { if (isThisTrip()) { setShareState(error instanceof ChangedSnapshot ? 'idle' : 'error'); setShareNotice(error instanceof Error ? error.message : '공유 링크를 준비하지 못했어요.'); } throw error; }
    finally { if (pending.current?.promise === request) pending.current = null; }
  }, [identity, snapshot]);
  useEffect(() => {
    if (!identity?.share || identity.share.expiresAt <= Date.now() || !options.selectedPlaceIds.length || synced.current === snapshot || shareState === 'error' || shareState === 'saving') return;
    const timer = setTimeout(() => void ensureShareUrl().catch(() => {}), 850);
    return () => clearTimeout(timer);
  }, [identity, snapshot, shareState, ensureShareUrl, options.selectedPlaceIds.length]);
  const sharePlan = useCallback(async () => {
    let preparedUrl = '';
    try {
      preparedUrl = await ensureShareUrl(); if (latest.current !== snapshot) return;
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(preparedUrl);
      if (mounted.current) { setShareState('done'); setShareNotice('공유 링크를 복사했어요.'); }
    } catch (error) {
      if (!mounted.current) return;
      if (error instanceof ChangedSnapshot) { setShareState('idle'); setShareNotice(error.message); }
      else if (preparedUrl) { setShareState('copy-error'); setShareNotice('공유 링크는 만들었지만 복사하지 못했어요. 아래 공유 일정 보기를 열어 주소를 복사하거나 링크 복사를 다시 눌러주세요.'); }
      else { setShareState('error'); setShareNotice(error instanceof Error ? error.message : '공유 링크를 준비하지 못했어요. 다시 시도해 주세요.'); }
    }
  }, [ensureShareUrl, snapshot]);
  const revokeShare = useCallback(async () => {
    const base = readTripIdentity(localStorage);
    if (!identity || base?.id !== identity.id || !base.share || pending.current) return false;
    revoking.current = true; setShareState('saving');
    try {
      await plannerJson(`/api/trips/${base.share.id}`, { method: 'POST', body: { operation: 'revoke', revision: base.share.revision } });
      const active = readTripIdentity(localStorage);
      if (!mounted.current || active?.id !== base.id || JSON.stringify(active.share) !== JSON.stringify(base.share)) return false;
      const next = writeTripIdentity(localStorage, { ...readTripIdentity(localStorage)!, share: null }); setIdentity(next); synced.current = ''; setShareState('idle'); setShareNotice('공유를 종료했어요. 이전 링크로는 볼 수 없어요.'); return true;
    } catch (error) { setShareState('error'); setShareNotice(error instanceof Error ? error.message : '공유를 종료하지 못했어요.'); return false; } finally { revoking.current = false; }
  }, [identity]);
  useEffect(() => {
    if (!identity?.share || options.selectedPlaceIds.length || shareState === 'saving' || shareState === 'error') return;
    const timer = setTimeout(() => void revokeShare(), 850);
    return () => clearTimeout(timer);
  }, [identity, options.selectedPlaceIds.length, shareState, revokeShare]);
  const refreshShareVersion = useCallback(async () => {
    const base = readTripIdentity(localStorage);
    if (!identity || base?.id !== identity.id || !base.share || pending.current || revoking.current) return;
    setShareState('saving');
    try {
      const data = await plannerJson<{ revision: number }>(`/api/trips/${base.share.id}`, { method: 'POST', body: { operation: 'status' } });
      const active = readTripIdentity(localStorage);
      if (!mounted.current || active?.id !== base.id || JSON.stringify(active.share) !== JSON.stringify(base.share)) return;
      if (!Number.isSafeInteger(data.revision) || data.revision < 1) throw new Error('링크의 최신 버전을 확인하지 못했어요.');
      setIdentity(writeTripIdentity(localStorage, { ...active, share: { id: base.share.id, expiresAt: base.share.expiresAt, revision: data.revision } })); synced.current = ''; setShareState('idle'); setShareNotice('현재 일정으로 공유 링크를 갱신하고 있어요.');
    } catch (error) { if (mounted.current) { setShareState('error'); setShareNotice(error instanceof Error ? error.message : '링크의 최신 버전을 확인하지 못했어요.'); } }
  }, [identity]);
  return { shareState, shareUrl, shareNotice, sharePlan, ensureShareUrl, revokeShare, refreshShareVersion };
}
