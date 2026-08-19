import { communityDate } from "../../../lib/community/types";
import type { useCommunityDetail } from "../hooks/useCommunityDetail";

export default function CommunityComments({ detail }: { detail: ReturnType<typeof useCommunityDetail> }) {
  const {
    comments, comment, setComment, commentState, editingComment, setEditingComment,
    editingContent, setEditingContent, session, submitComment, saveComment, deleteComment,
  } = detail;
  return <section className="comments" aria-labelledby="comments-title">
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
  </section>;
}
