"use client";

import { useEffect, useRef, useState } from 'react';
import { getCommunityPost, isCommunityRequestError } from '../client/api';
import { useCommunityBookmarks } from '../hooks/useCommunityBookmarks';
import type { CommunityPost } from '../../../lib/community/types';
import { communityDate } from '../../../lib/community/types';

type SavedResult = { id: string; post?: CommunityPost; missing?: boolean };
export default function CommunitySavedPosts() {
  const bookmarks = useCommunityBookmarks();
  const [page, setPage] = useState(0), [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState<{ signature: string; rows: SavedResult[] } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(bookmarks.ids.length / 10) - 1));
  const ids = bookmarks.ids.slice(currentPage * 10, currentPage * 10 + 10);
  const signature = JSON.stringify(ids);
  useEffect(() => {
    const controller = new AbortController();
    const requested = JSON.parse(signature) as string[];
    void Promise.all(requested.map(async id => {
      try {
        const { post } = await getCommunityPost(id, controller.signal);
        return post.id === id ? { id, post } : { id };
      } catch (error) { return { id, missing: isCommunityRequestError(error) && [404, 410].includes(error.status) }; }
    })).then(rows => { if (!controller.signal.aborted) setLoaded({ signature, rows }); });
    return () => controller.abort();
  }, [signature, retry]);
  const loading = !bookmarks.ready || (ids.length > 0 && loaded?.signature !== signature);
  const remove = (id: string) => { if (bookmarks.change(id, false)) heading.current?.focus(); };
  return <section className="community-state" aria-labelledby="community-saved-title" aria-busy={loading}>
    <h3 id="community-saved-title" ref={heading} tabIndex={-1}>이 기기에 저장한 글</h3>
    <p>계정과 동기화되지 않습니다. 브라우저 데이터를 지우면 저장 목록도 지워집니다.</p>
    {bookmarks.message ? <div role="alert"><p>{bookmarks.message}</p><button type="button" onClick={bookmarks.refresh}>저장 목록 다시 읽기</button></div> : loading ? <p role="status">저장한 글을 확인하는 중</p> : !ids.length ? <p>아직 이 기기에 저장한 글이 없습니다.</p> : <>
      <ul className="comment-list">{loaded?.rows.map(row => <li key={row.id}>
        {row.post ? <><a href={`/community/${row.id}`}><b>{row.post.title}</b></a><p>{row.post.authorName} · {communityDate(row.post.createdAt)} · 좋아요 {row.post.likeCount} · 댓글 {row.post.commentCount}</p></> : <p>{row.missing ? '삭제되었거나 공개되지 않은 글입니다.' : '게시글을 불러오지 못했어요. 저장 기록은 유지합니다.'}</p>}
        <footer><button type="button" onClick={() => remove(row.id)}>저장 해제</button>{!row.post && !row.missing && <button type="button" onClick={() => { setLoaded(null); setRetry(value => value + 1); }}>게시글 다시 확인</button>}</footer>
      </li>)}</ul>
      <nav className="community-pagination" aria-label="저장한 글 페이지"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>이전 저장한 글</button><span>{currentPage + 1} 페이지</span><button type="button" disabled={(currentPage + 1) * 10 >= bookmarks.ids.length} onClick={() => setPage(currentPage + 1)}>다음 저장한 글</button></nav>
    </>}
  </section>;
}
