/* eslint-disable @next/next/no-html-link-for-pages */

import { COMMUNITY_CATEGORY_LABELS, communityDate } from "../../../lib/community/types";
import type { useCommunityDetail } from "../hooks/useCommunityDetail";

export default function CommunityPostArticle({ detail }: { detail: ReturnType<typeof useCommunityDetail> }) {
  const { post, message, sessionPending, toggleLike, deletePost } = detail;
  if (!post) return null;
  return <>
    <header>
      <a href="/community" className="detail-back">← 여행자 이야기</a>
      <div className="community-card-meta"><span className={`category-${post.category}`}>{COMMUNITY_CATEGORY_LABELS[post.category]}</span><time dateTime={new Date(post.createdAt).toISOString()}>{communityDate(post.createdAt)}</time></div>
      <h1>{post.title}</h1>
      <div className="detail-byline"><strong>{post.authorName}</strong>{post.updatedAt > post.createdAt && <small>수정됨</small>}</div>
      {(post.region || post.placeName) && <a className="detail-place" href={`/planner?region=${encodeURIComponent(post.region || "창원")}`}><span aria-hidden="true">⌖</span><div><small>연결된 여행지</small><strong>{post.region}{post.placeName ? `${post.region ? " · " : ""}${post.placeName}` : ""}</strong></div><i aria-hidden="true">→</i></a>}
    </header>
    <div className="detail-content">{post.content.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    <footer className="detail-actions">
      <button type="button" className={post.likedByMe ? "liked" : ""} aria-pressed={post.likedByMe} onClick={() => void toggleLike()} disabled={sessionPending}><span aria-hidden="true">♥</span>{post.likedByMe ? "공감했어요" : "도움이 됐어요"} <b>{post.likeCount}</b></button>
      {post.isOwner && <div><a href={`/community/${post.id}/edit`}>수정</a><button type="button" onClick={() => void deletePost()}>삭제</button></div>}
    </footer>
    {message && <p className="detail-message" role="alert">{message}</p>}
  </>;
}
