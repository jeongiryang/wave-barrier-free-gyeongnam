"use client";
import { useCallback, useEffect, useState } from 'react';
import { Spinner } from '../../../components/LoadingState';
import KakaoIcon from '../../kakao-travel/KakaoIcon';
import { loadKakaoShare } from '../../kakao-travel/sdk';
import { travelCard } from '../../../lib/kakao-travel.js';
import { readTripValue, CURRENT_TRIP_KEY, CURRENT_TRIP_EXPORT_KEYS } from '../../../lib/current-trip-storage.js';
import { usePlaceDialogFocus } from '../hooks/usePlaceDialogFocus';
import type { useTripSelection } from '../hooks/useTripSelection';
import type { usePlannerParticipation } from '../hooks/usePlannerParticipation';
import { useTripTimingConfirmation } from './TripTimingConfirmation';
function download(text: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function ShareIcon({ kind }: { kind: 'link'|'file'|'calendar' }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{kind === 'link' ? <><path d="m9 15 6-6M7 14l-2 2a4 4 0 0 0 6 6l4-4M17 10l2-2a4 4 0 0 0-6-6L9 6" /></> : kind === 'file' ? <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></> : <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18M7 15h3m4 0h3"/></>}</svg>; }
export default function TripShareMenu({ trip, participation, timingWarnings = [] }: { trip: ReturnType<typeof useTripSelection>; participation: ReturnType<typeof usePlannerParticipation>; region: string; timingWarnings?: string[] }) {
  const [open, setOpen] = useState(false), [sdk, setSdk] = useState(false), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const close = useCallback(() => { setOpen(false); setNotice(''); }, []);
  const ref = usePlaceDialogFocus(open, close);
  const tripRegion = [...new Set(trip.orderedSavedPlaces.map(place => place.city).filter(Boolean))].join(' · ') || '경남';
  const timing = useTripTimingConfirmation(timingWarnings, JSON.stringify([trip.voiceRevision, timingWarnings]));
  useEffect(() => {
    if (!open) return;
    let active = true;
    void loadKakaoShare().then(() => { if (active) setSdk(true); }).catch(() => { if (active) setSdk(false); });
    return () => { active = false; };
  }, [open]);
  async function calendar() {
    if (busy) return;
    setBusy(true); setNotice('');
    try {
      const { buildTripCalendarIcs } = await import('../../../lib/trip-calendar.js');
      download(buildTripCalendarIcs({ travelStart: trip.travelStart, travelEnd: trip.travelEnd, dayStartTime: trip.dayStartTime, travelMode: trip.travelMode, title: `${tripRegion} 여행`, region: tripRegion, placeNames: trip.orderedSavedPlaces.map(place => place.name) }), 'text/calendar;charset=utf-8', 'wave-trip.ics');
      setNotice('캘린더 파일을 내려받았어요.');
    } catch { setNotice('캘린더를 만들지 못했어요. 여행 날짜와 시작 시각을 확인해 주세요.'); } finally { setBusy(false); }
  }
  return <><button type="button" lang="ko" data-planner-tool="share" disabled={!trip.saved.length} onClick={() => { setNotice(''); setOpen(true); }}>공유</button>{!open && participation.shareState === 'error' && <span lang="ko" className="simple-share-error" role="status">공유 링크 갱신을 확인해 주세요.</span>}{open && <dialog ref={ref} lang="ko" className="simple-dialog simple-share-menu" aria-labelledby="share-menu-title"><header><h2 id="share-menu-title">여행 공유</h2><button type="button" aria-label="공유 닫기" onClick={close}>×</button></header><div className="simple-share-options">
    <button type="button" disabled={!sdk || !participation.shareUrl || ['saving','error'].includes(participation.shareState)} onClick={() => { try { if (!window.Kakao?.Share) throw new Error(); window.Kakao.Share.sendDefault(travelCard({ region: tripRegion, travelStart: trip.travelStart, travelEnd: trip.travelEnd, placeIds: trip.saved }, participation.shareUrl)); } catch { setNotice('카카오톡 공유 창을 열지 못했어요. 링크 복사를 이용해 주세요.'); } }}><KakaoIcon /><span>카카오톡</span></button>
    <button type="button" disabled={!participation.shareUrl || participation.shareState === 'saving'} onClick={() => { setNotice(''); void participation.sharePlan(); }}><ShareIcon kind="link"/><span>링크 복사</span></button>
    <button type="button" onClick={() => { try { const values = Object.fromEntries(CURRENT_TRIP_EXPORT_KEYS.map(key => [key, readTripValue(localStorage, key)])); download(JSON.stringify({ version: 1, values, format: CURRENT_TRIP_KEY }, null, 2), 'application/json', 'wave-trip.json'); setNotice('여행 파일을 내려받았어요.'); } catch { setNotice('여행 파일을 읽지 못했어요. 화면의 일정은 그대로예요.'); } }}><ShareIcon kind="file"/><span>여행 파일</span></button>
    <button type="button" data-planner-tool="calendar" aria-disabled={busy} aria-busy={busy} onClick={() => void calendar()}>{busy ? <Spinner /> : <ShareIcon kind="calendar"/>}<span>캘린더</span></button>
  </div>{participation.shareState === 'saving' && <p role="status"><Spinner />공유 링크를 준비하고 있어요.</p>}
  <p id="share-public-conditions" className="simple-share-caption">링크를 가진 누구나 일정의 장소와 날짜를 볼 수 있어요. 같은 링크에 수정한 일정이 반영돼요. 발급일부터 30일 동안 볼 수 있고, 편의 조건·메모·현재 위치는 공유하지 않아요.</p>
  {!participation.shareUrl && <button type="button" aria-describedby="share-public-conditions" disabled={participation.shareState === 'saving'} onClick={() => timing.request(() => { setNotice(''); void participation.ensureShareUrl().catch(() => {}); })}>공개 링크 만들기</button>}
  {(notice || participation.shareNotice) && <p role="status">
    {notice}
    {participation.shareNotice && (!notice || ['error', 'copy-error'].includes(participation.shareState)) && <>{notice && <br />}{participation.shareNotice}</>}
  </p>}
  {participation.shareUrl && participation.shareState === 'error' && <button type="button" onClick={() => { setNotice(''); void participation.refreshShareVersion(); }}>현재 일정으로 링크 갱신</button>}
  {participation.shareUrl && <div className="simple-share-link"><a href={participation.shareUrl} target="_blank" rel="noreferrer">공유 일정 보기</a><button type="button" disabled={participation.shareState === 'saving'} onClick={() => { setNotice(''); void participation.revokeShare(); }}>공유 종료</button></div>}
  </dialog>}{timing.confirmation}</>;
}
