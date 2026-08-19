"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth/client";
import { COMMUNITY_CATEGORY_LABELS, communityDate, type CommunityComment, type CommunityPost } from "../lib/community/types";

type DetailResponse = { post?: CommunityPost; comments?: CommunityComment[]; error?: string };

export default function CommunityDetail({ postId }: { postId: string }) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [comment, setComment] = useState("");
  const [commentState, setCommentState] = useState<"idle" | "saving" | "error">("idle");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch(`/api/community/posts/${postId}`, { headers: { Accept: "application/json" } });
      const payload = await response.json() as DetailResponse;
      if (!response.ok || !payload.post) throw new Error(payload.error || "게시글을 불러오지 못했습니다.");
      setPost(payload.post);
      setComments(payload.comments || []);
      setState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "게시글을 불러오지 못했습니다.");
      setState("error");
    }
  }, [postId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, session?.user]);

  function loginForCurrentPage() {
    router.push(`/login?next=${encodeURIComponent(`/community/${postId}`)}`);
  }

  async function toggleLike() {
    if (!session?.user) { loginForCurrentPage(); return; }
    if (!post) return;
    const response = await fetch(`/api/community/posts/${postId}/like`, { method: post.likedByMe ? "DELETE" : "POST", headers: { Accept: "application/json" } });
    const payload = await response.json() as { liked?: boolean; likeCount?: number; error?: string };
    if (response.status === 401) { loginForCurrentPage(); return; }
    if (!response.ok) { setMessage(payload.error || "좋아요를 반영하지 못했습니다."); return; }
    setPost((current) => current ? { ...current, likedByMe: Boolean(payload.liked), likeCount: Number(payload.likeCount || 0) } : current);
  }

  async function deletePost() {
    if (!post || !window.confirm("이 게시글과 댓글을 모두 삭제할까요? 삭제 후 되돌릴 수 없습니다.")) return;
    const response = await fetch(`/api/community/posts/${postId}`, { method: "DELETE", headers: { Accept: "application/json" } });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setMessage(payload.error || "게시글을 삭제하지 못했습니다."); return; }
    router.push("/community");
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!session?.user) { loginForCurrentPage(); return; }
    setCommentState("saving");
    setMessage("");
    const response = await fetch(`/api/community/posts/${postId}/comments`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ content: comment }) });
    const payload = await response.json() as { error?: string };
    if (response.status === 401) { loginForCurrentPage(); return; }
    if (!response.ok) { setMessage(payload.error || "댓글을 저장하지 못했습니다."); setCommentState("error"); return; }
    setComment(""); setCommentState("idle"); await load();
  }

  async function saveComment(commentId: string) {
    const response = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ content: editingContent }) });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setMessage(payload.error || "댓글을 수정하지 못했습니다."); return; }
    setEditingComment(null); setEditingContent(""); await load();
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    const response = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, { method: "DELETE", headers: { Accept: "application/json" } });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setMessage(payload.error || "댓글을 삭제하지 못했습니다."); return; }
    await load();
  }

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
