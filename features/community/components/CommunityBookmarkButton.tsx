"use client";

import { useCommunityBookmarks } from '../hooks/useCommunityBookmarks';

export default function CommunityBookmarkButton({ postId }: { postId: string }) {
  const bookmarks = useCommunityBookmarks();
  const saved = bookmarks.ids.includes(postId);
  return <div className="community-bookmark">
    <button type="button" disabled={!bookmarks.ready} aria-pressed={saved} onClick={() => bookmarks.change(postId, !saved)}>{saved ? '저장 해제' : '이 기기에 저장'}</button>
    {bookmarks.message && <p role="alert">{bookmarks.message}</p>}
  </div>;
}
