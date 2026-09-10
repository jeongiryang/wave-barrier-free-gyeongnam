import { COMMUNITY_CATEGORY_LABELS, communityDate } from "../../../lib/community/types";
import type { useCommunityBoard } from "../hooks/useCommunityBoard";

export default function CommunityPostList({ board, layout }: { board: ReturnType<typeof useCommunityBoard>; layout: "cards" | "list" }) {
  const { posts, placeFilter, page, hasMore, state, message, load, writeHref } = board;
  return <>
    <div aria-live="polite" aria-busy={state === "loading"}>
      {state === "loading" && <div className="community-skeletons" role="status"><span className="sr-only">게시글을 불러오는 중</span>{[1, 2, 3].map((item) => <i key={item} />)}</div>}
      {state === "error" && <div className="community-state" role="alert"><b>후기를 불러오지 못했습니다.</b><p>{message}</p><button type="button" onClick={() => void load(page)}>다시 시도</button></div>}
      {state === "ready" && posts.length === 0 && <div className="community-state empty"><span aria-hidden="true">≈</span><b>{placeFilter ? "이 관광지의 첫 후기를 기다리고 있어요." : "아직 등록된 후기나 질문이 없습니다."}</b><p>직접 경험한 내용이나 궁금한 점을 가장 먼저 남겨 주세요. 방문 시점과 이동 조건을 함께 적으면 다른 여행자의 판단에 도움이 됩니다.</p><a href={writeHref}>후기 작성</a></div>}
      {state === "ready" && posts.length > 0 && <div className="community-list" data-layout={layout}>{posts.map((post) => <article key={post.id} data-category={post.category}>
        <a href={`/community/${post.id}`} aria-label={`${post.title} 게시글 읽기`}><div className="community-story-cover" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={post.category === "general" ? "M8 8h24v18H18L8 34V8Zm28 8h4v24l-9-7h-8v-3" : post.category === "review" ? "M8 6h26a5 5 0 0 1 5 5v31H13a5 5 0 0 1-5-5V6Zm0 28h31M16 15h15M16 22h11" : "M35 18c0 9-11 21-11 21S13 27 13 18a11 11 0 1 1 22 0ZM28 18a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"} /></svg><span>{post.region || "경남의 하루"}</span><small>{COMMUNITY_CATEGORY_LABELS[post.category]}</small></div><div className="community-card-meta"><span className={`category-${post.category}`}>{COMMUNITY_CATEGORY_LABELS[post.category]}</span><time dateTime={new Date(post.createdAt).toISOString()}>{communityDate(post.createdAt)}</time></div><h3>{post.title}</h3><p>{post.content}</p>{(post.region || post.placeName) && <div className="community-place-tag"><span aria-hidden="true">⌖</span>{post.region}{post.placeName ? `${post.region ? " · " : ""}${post.placeName}` : ""}</div>}{(post.fieldReports?.length || 0) > 0 && <div className="community-report-tag">여행자 현장 제보 {post.fieldReports.length}개 · 공식 점수 미반영</div>}<footer><span>{post.authorName}</span><span>좋아요 {post.likeCount} · 댓글 {post.commentCount}</span></footer></a>
      </article>)}</div>}
    </div>
    {state === "ready" && posts.length > 0 && <nav className="community-pagination" aria-label="게시글 페이지"><button type="button" disabled={page <= 1} onClick={() => void load(page - 1)}>이전</button><span>{page} 페이지</span><button type="button" disabled={!hasMore} onClick={() => void load(page + 1)}>다음</button></nav>}
  </>;
}
