"use client";

import { useMemo, useState, useSyncExternalStore } from 'react';
import { changeCommunityBookmark, COMMUNITY_BOOKMARK_KEY, readCommunityBookmarks } from '../../../lib/community/bookmarks';

const changedEvent = 'wave:community-bookmarks';
function snapshot() {
  try { return localStorage.getItem(COMMUNITY_BOOKMARK_KEY) || '[]'; }
  catch { return 'unavailable'; }
}
function subscribe(refresh: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === COMMUNITY_BOOKMARK_KEY || event.key === null) refresh(); };
  window.addEventListener(changedEvent, refresh);
  window.addEventListener('storage', storage);
  return () => { window.removeEventListener(changedEvent, refresh); window.removeEventListener('storage', storage); };
}
export function useCommunityBookmarks() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => undefined);
  const [actionMessage, setMessage] = useState('');
  const { ids, readError } = useMemo(() => {
    try { return { ids: raw === undefined ? [] : readCommunityBookmarks({ getItem: () => raw }), readError: false }; }
    catch { return { ids: [] as string[], readError: true }; }
  }, [raw]);
  const refresh = () => { setMessage(''); window.dispatchEvent(new Event(changedEvent)); };
  const change = (id: string, saved: boolean) => {
    try {
      changeCommunityBookmark(localStorage, id, saved);
      refresh();
      return true;
    } catch (error) {
      setMessage(error instanceof RangeError ? '이 기기에 50개까지 저장할 수 있어요. 다른 글을 해제한 뒤 다시 저장해 주세요.' : '저장 상태를 바꾸지 못했어요. 브라우저 저장 공간과 설정을 확인한 뒤 다시 시도해 주세요.');
      return false;
    }
  };
  return { ids, ready: raw !== undefined, message: actionMessage || (readError ? '이 기기의 저장한 글을 읽지 못했어요. 브라우저 저장 설정을 확인한 뒤 다시 시도해 주세요.' : ''), refresh, change };
}
