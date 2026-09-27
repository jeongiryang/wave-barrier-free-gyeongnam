"use client";

import { useCommunityBookmarks } from '../hooks/useCommunityBookmarks';
import NightIcon from '../../../components/NightIcon';

export default function CommunityBookmarkButton({ postId }: { postId: string }) {
  const bookmarks = useCommunityBookmarks();
  const saved = bookmarks.ids.includes(postId);
  return <div className="community-bookmark">
    <button type="button" data-icon-action="" title={saved ? '저장 해제' : '이 기기에 저장'} aria-label={saved ? '저장 해제' : '이 기기에 저장'} disabled={!bookmarks.ready} aria-pressed={saved} onClick={() => bookmarks.change(postId, !saved)}><NightIcon name={saved ? 'bookmark-remove' : 'bookmark'} size={20}/></button>
    {bookmarks.message && <p role="alert">{bookmarks.message}</p>}
  </div>;
}
