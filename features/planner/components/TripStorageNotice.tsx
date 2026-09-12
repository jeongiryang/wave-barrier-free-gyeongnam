'use client';
import { useEffect, useSyncExternalStore } from 'react';
import { replaceCurrentTrip, subscribeTripStorage, tripStorageFailed } from '../../../lib/current-trip-storage.js';

const failed = () => { try { return tripStorageFailed(window.localStorage); } catch { return true; } };
export default function TripStorageNotice({ snapshot }: { snapshot: Record<string, string> }) {
  const unsaved = useSyncExternalStore(subscribeTripStorage, failed, () => false);
  useEffect(() => {
    if (!unsaved) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [unsaved]);
  if (!unsaved) return <p className="planner-storage-note">담은 장소와 일정은 이 기기에 자동으로 보관돼요.</p>;
  return <div className="result-notice error" role="alert"><strong>이 탭에만 남아 있는 변경 사항이 있어요.</strong><p>브라우저 저장 공간을 사용할 수 없습니다. 화면을 닫기 전에 다시 저장하거나 여행 파일을 내려받아 주세요.</p>
    <button type="button" onClick={() => { try { replaceCurrentTrip(window.localStorage, snapshot); } catch { /* Keep the recovery controls visible. */ } }}>저장 다시 시도</button>
    <button type="button" onClick={() => {
      const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, values: snapshot }, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'wave-current-trip.json'; link.click(); URL.revokeObjectURL(url);
    }}>여행 파일 내려받기</button>
  </div>;
}
