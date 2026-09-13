'use client';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { replaceCurrentTrip, subscribeTripStorage, tripStorageFailed, tripStorageConflict } from '../../../lib/current-trip-storage.js';

const failed = () => { try { return tripStorageFailed(window.localStorage); } catch { return true; } };
export default function TripStorageNotice({ snapshot }: { snapshot: Record<string, string> }) {
  const intentionalLoad = useRef(false);
  const unsaved = useSyncExternalStore(subscribeTripStorage, failed, () => false);
  useEffect(() => {
    if (!unsaved) return;
    const guard = (event: BeforeUnloadEvent) => { if (!intentionalLoad.current) event.preventDefault(); };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [unsaved]);
  if (!unsaved) return null;
  let conflict = false; try { conflict = tripStorageConflict(window.localStorage); } catch { /* Read failure keeps recovery. */ }
  if (conflict) return <div className="result-notice error" role="alert"><p>다른 탭에서 여행이 바뀌었어요. 이 탭의 변경으로 덮어쓰지 않도록 편집을 멈췄어요.</p><button type="button" onClick={() => { intentionalLoad.current = true; window.location.assign("/planner"); }}>현재 여행 불러오기</button></div>;
  return <div className="result-notice error" role="alert"><strong>이 탭에만 남아 있는 변경 사항이 있어요.</strong><p>브라우저 저장 공간을 사용할 수 없습니다. 화면을 닫기 전에 다시 저장하거나 여행 파일을 내려받아 주세요.</p>
    <button type="button" onClick={() => { try { replaceCurrentTrip(window.localStorage, snapshot); } catch { /* Keep the recovery controls visible. */ } }}>저장 다시 시도</button>
    <button type="button" onClick={() => {
      const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, values: snapshot }, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'wave-current-trip.json'; link.click(); URL.revokeObjectURL(url);
    }}>여행 파일 내려받기</button>
  </div>;
}
