import { COMMUNITY_CATEGORY_LABELS, communityDate } from "../../../lib/community/types";
import type { useCommunityBoard } from "../hooks/useCommunityBoard";

export default function CommunityPostList({ board }: { board: ReturnType<typeof useCommunityBoard> }) {
  const { posts, placeFilter, page, hasMore, state, message, load, writeHref } = board;
  return <>
    <div aria-live="polite" aria-busy={state === "loading"}>
      {state === "loading" && <div className="community-skeletons" role="status"><span className="sr-only">게시글을 불러오는 중</span>{[1, 2, 3].map((item) => <i key={item} />)}</div>}
      {state === "error" && <div className="community-state" role="alert"><b>이야기를 불러오지 못했습니다.</b><p>{message}</p><button type="button" onClick={() => void load(page)}>다시 시도</button></div>}
      {state === "ready" && posts.length === 0 && <div className="community-state empty"><span aria-hidden="true">≈</span><b>{placeFilter ? "이 관광지의 첫 이야기를 기다리고 있어요." : "아직 등록된 이야기가 없습니다."}</b><p>실제 경험과 궁금한 점을 가장 먼저 남겨 주세요. 예시 게시글을 실제 글처럼 채워 두지 않습니다.</p><a href={writeHref}>첫 이야기 쓰기</a></div>}
      {state === "ready" && posts.length > 0 && <div className="community-list">{posts.map((post) => <article key={post.id}>
        <a href={`/community/${post.id}`} aria-label={`${post.title} 게시글 읽기`}><div className="community-card-meta"><span className={`category-${post.category}`}>{COMMUNITY_CATEGORY_LABELS[post.category]}</span>{post.isSample && <span className="sample-badge">샘플</span>}<time dateTime={new Date(post.createdAt).toISOString()}>{communityDate(post.createdAt)}</time></div><h3>{post.title}</h3><p>{post.content}</p>{(post.region || post.placeName) && <div className="community-place-tag"><span aria-hidden="true">⌖</span>{post.region}{post.placeName ? `${post.region ? " · " : ""}${post.placeName}` : ""}</div>}{(post.fieldReports?.length || 0) > 0 && <div className="community-report-tag">여행자 현장 제보 {post.fieldReports.length}개 · 공식 점수 미반영</div>}<footer><span>{post.authorName}</span><span>좋아요 {post.likeCount} · 댓글 {post.commentCount}</span></footer></a>
      </article>)}</div>}
    </div>
    {state === "ready" && posts.length > 0 && <nav className="community-pagination" aria-label="게시글 페이지"><button type="button" disabled={page <= 1} onClick={() => void load(page - 1)}>이전</button><span>{page} 페이지</span><button type="button" disabled={!hasMore} onClick={() => void load(page + 1)}>다음</button></nav>}
  </>;
}
