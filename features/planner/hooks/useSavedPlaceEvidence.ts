'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Place } from '../types';
import { plannerJson } from '../services/api';
const NO_PLACES: Place[] = [];

export function useSavedPlaceEvidence(ids: string[], profiles: string[], ready: boolean) {
  const signature = JSON.stringify([ids, profiles]);
  const [result, setResult] = useState<{ signature: string; places: Place[]; missing: number }>({ signature: '', places: [], missing: 0 });
  const [loading, setLoading] = useState(false), [notice, setNotice] = useState(''), [version, setVersion] = useState(0);
  useEffect(() => {
    if (!ready || !ids.length) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setNotice('담아둔 장소의 최신 편의 정보를 확인하고 있어요.');
      const params = new URLSearchParams({ action: 'places', ids: ids.join(','), profiles: profiles.join(',') });
      void plannerJson<{ places: Place[]; missing: string[] }>(`/api/wave?${params}`, { signal: controller.signal, timeoutMs: 14000 }).then(data => {
        if (!Array.isArray(data.places) || !Array.isArray(data.missing)) throw new Error();
        if (!controller.signal.aborted) { setResult({ signature, places: data.places, missing: data.missing.length }); setNotice(data.places.some(place => place.facilityLookupState === 'error') ? '장소 위치를 확인했지만 편의정보 제공처에는 연결하지 못했어요. 미확인 시설은 방문 전 문의해 주세요.' : data.missing.length ? `${data.missing.length}곳의 최신 정보를 받지 못했어요. 저장한 방문일과 순서는 유지합니다.` : '담아둔 장소의 최신 관광 정보를 확인했어요.'); }
      }).catch(() => { if (!controller.signal.aborted) setNotice('최신 정보를 불러오지 못했어요. 저장한 일정은 유지되며 다시 확인할 수 있어요.'); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  // The serialized signature identifies precisely the ID/profile request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, signature, version]);
  return { places: result.signature === signature ? result.places : NO_PLACES, loading: ids.length > 0 && loading, notice: ids.length ? notice : '', retry: useCallback(() => setVersion(value => value + 1), []) };
}
