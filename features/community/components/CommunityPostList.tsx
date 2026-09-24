import SmartSpotImage from "../../tourism/components/SmartSpotImage";
import { regionShowcasePhotos } from "../../landing/region-showcase-photos";
import type { CommunityLayout } from "../view-layout";
import { COMMUNITY_CATEGORY_LABELS, communityDate } from "../../../lib/community/types";
import type { useCommunityBoard } from "../hooks/useCommunityBoard";
import { fieldReportAgeMessage } from "../../../lib/community/field-report-board.js";
import CommunityBookmarkButton from './CommunityBookmarkButton';

export default function CommunityPostList({ board, layout, hideEmpty = false }: { board: ReturnType<typeof useCommunityBoard>; layout: CommunityLayout; hideEmpty?: boolean }) {
  const { posts, placeFilter, page, hasMore, state, message, load, writeHref, query, category, resetSearch } = board;
  return <>
    <div aria-live="polite" aria-busy={state === "loading"}>
      {state === "loading" && <div className="community-skeletons" role="status"><span className="sr-only">게시글을 불러오는 중</span>{[1, 2, 3].map((item) => <i key={item} />)}</div>}
      {state === "error" && <div className="community-state" role="alert"><b>후기를 불러오지 못했습니다.</b><p>{message}</p><button type="button" onClick={() => void load(page)}>다시 시도</button></div>}
      {state === "ready" && posts.length === 0 && !hideEmpty && <div className="community-state empty"><span aria-hidden="true">≈</span><b>{query || category ? "검색 조건에 맞는 게시글이 없습니다." : placeFilter ? "이 관광지의 첫 후기를 기다리고 있어요." : "아직 등록된 후기나 질문이 없습니다."}</b>{query || category ? <><p>검색어나 글 종류를 바꾸어 다시 찾아보세요.</p><button type="button" onClick={resetSearch}>검색 조건 초기화</button></> : <p>직접 경험한 내용이나 궁금한 점을 남겨 주세요. 방문 시점과 이동 조건을 함께 적으면 다른 여행자의 판단에 도움이 됩니다.</p>}<a href={writeHref}>후기 작성</a></div>}
      {state === "ready" && posts.length > 0 && <div className="community-list" data-layout={layout}>{posts.map((post) => <article key={post.id} data-category={post.category}>
        <a href={`/community/${post.id}`} aria-label={`${post.title} 게시글 읽기`}><div className="community-story-cover" aria-hidden="true"><SmartSpotImage title={post.placeName || regionShowcasePhotos[post.region || '통영']?.title || '경남 여행'} region={post.region || '경남'} src={post.placeId ? undefined : regionShowcasePhotos[post.region || '통영']?.image} contentId={post.placeId || undefined} tag={COMMUNITY_CATEGORY_LABELS[post.category]} rank={0} showMeta={false}/></div><div className="community-card-meta"><span className={`category-${post.category}`}>{COMMUNITY_CATEGORY_LABELS[post.category]}</span><time dateTime={new Date(post.createdAt).toISOString()}>{communityDate(post.createdAt)}</time></div><h3>{post.title}</h3><p>{post.content}</p>{(post.region || post.placeName) && <div className="community-place-tag"><span aria-hidden="true">⌖</span>{post.region}{post.placeName ? `${post.region ? " · " : ""}${post.placeName}` : ""}</div>}{post.category === "field-report" && post.visitDate && <div className="community-report-tag">확인 {post.visitDate}{fieldReportAgeMessage(post.visitDate) ? ` · ${fieldReportAgeMessage(post.visitDate)}` : ""}</div>}{(post.fieldReports?.length || 0) > 0 && <div className="community-report-tag">여행자 현장 제보 {post.fieldReports.length}개 · 공식 점수 미반영</div>}{(post.photoCount || 0) > 0 && <div className="community-report-tag">현장 사진 {post.photoCount}장 · 방문 {post.visitDate}</div>}<footer><span>{post.authorName}</span><span>좋아요 {post.likeCount} · 댓글 {post.commentCount}</span></footer></a>
        <div className="detail-actions"><CommunityBookmarkButton postId={post.id}/></div>
      </article>)}</div>}
    </div>
    {state === "ready" && posts.length > 0 && <nav className="community-pagination" aria-label="게시글 페이지"><button type="button" disabled={page <= 1} onClick={() => void load(page - 1)}>이전</button><span>{page} 페이지</span><button type="button" disabled={!hasMore} onClick={() => void load(page + 1)}>다음</button></nav>}
  </>;
}
