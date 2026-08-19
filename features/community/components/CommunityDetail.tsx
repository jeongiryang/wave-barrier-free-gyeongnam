"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import { COMMUNITY_CATEGORY_LABELS, communityDate } from "../../../lib/community/types";
import { useCommunityDetail } from "../hooks/useCommunityDetail";

export default function CommunityDetail({ postId }: { postId: string }) {
  const {
    post, comments, state, message, comment, setComment, commentState,
    editingComment, setEditingComment, editingContent, setEditingContent,
    session, sessionPending, load, toggleLike, deletePost, submitComment,
    saveComment, deleteComment,
  } = useCommunityDetail(postId);

  if (state === "loading") return <div className="community-detail-state" role="status" aria-live="polite"><i /><b>여행자 이야기를 불러오는 중</b></div>;
  if (state === "error" || !post) return <div className="community-detail-state" role="alert"><b>게시글을 열지 못했습니다.</b><p>{message}</p><button type="button" onClick={() => void load()}>다시 시도</button><a href="/community">목록으로 돌아가기</a></div>;

  return (
    <article className="community-detail">
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

      <section className="comments" aria-labelledby="comments-title">
        <div className="comments-heading"><div><p className="section-kicker">CONVERSATION</p><h2 id="comments-title">댓글 {comments.length}</h2></div><p>서로의 이동 조건과 경험이 다를 수 있어요. 단정하기보다 직접 확인한 범위를 함께 적어 주세요.</p></div>
        <form className="comment-form" onSubmit={submitComment}>
          <label htmlFor="new-comment">댓글 남기기</label>
          <textarea id="new-comment" value={comment} onChange={(event) => setComment(event.target.value)} rows={4} minLength={2} maxLength={1000} required placeholder={session?.user ? "궁금한 점이나 직접 확인한 경험을 적어 주세요." : "로그인 후 댓글을 남길 수 있습니다."} />
          <div><small>2자 이상 1,000자 이하</small><button type="submit" disabled={commentState === "saving"}>{commentState === "saving" ? "등록하는 중…" : session?.user ? "댓글 등록" : "로그인하고 댓글 쓰기"}</button></div>
        </form>
        {comments.length === 0 ? <div className="comments-empty"><span aria-hidden="true">≈</span><p>아직 댓글이 없습니다. 첫 대화를 시작해 주세요.</p></div> : <ol className="comment-list">{comments.map((item) => <li key={item.id}>
          <header><strong>{item.authorName}</strong><time dateTime={new Date(item.createdAt).toISOString()}>{communityDate(item.createdAt)}</time></header>
          {editingComment === item.id ? <div className="comment-edit"><label className="sr-only" htmlFor={`comment-${item.id}`}>댓글 수정</label><textarea id={`comment-${item.id}`} value={editingContent} onChange={(event) => setEditingContent(event.target.value)} minLength={2} maxLength={1000} rows={4} /><div><button type="button" onClick={() => { setEditingComment(null); setEditingContent(""); }}>취소</button><button type="button" onClick={() => void saveComment(item.id)}>저장</button></div></div> : <p>{item.content}</p>}
          {item.isOwner && editingComment !== item.id && <footer><button type="button" onClick={() => { setEditingComment(item.id); setEditingContent(item.content); }}>수정</button><button type="button" onClick={() => void deleteComment(item.id)}>삭제</button></footer>}
        </li>)}</ol>}
      </section>
    </article>
  );
}
