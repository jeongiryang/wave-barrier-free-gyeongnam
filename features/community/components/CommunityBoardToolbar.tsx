import { COMMUNITY_CATEGORY_LABELS } from "../../../lib/community/types";
import type { useCommunityBoard } from "../hooks/useCommunityBoard";

export default function CommunityBoardToolbar({ board }: { board: ReturnType<typeof useCommunityBoard> }) {
  const { category, setCategory, search, setSearch, placeFilter, setPlaceFilter, writeHref, submitSearch } = board;
  return <>
    <div className="community-toolbar"><div><p className="section-kicker">여행자 경험</p><h2 id="community-list-title">여행 후기와 질문</h2></div><a className="community-write" href={writeHref}>후기 작성 <span aria-hidden="true">＋</span></a></div>
    {placeFilter && <aside className="community-place-filter" aria-label="관광지 필터"><span><small>지금 보고 있는 관광지</small><strong>{placeFilter.region ? `${placeFilter.region} · ` : ""}{placeFilter.name}</strong></span><button type="button" onClick={() => setPlaceFilter(null)}>전체 후기 보기</button></aside>}
    <div className="community-controls">
      <div className="community-tabs" role="group" aria-label="게시판 선택">{[["", "전체"], ...Object.entries(COMMUNITY_CATEGORY_LABELS)].map(([value, label]) => <button key={value || "all"} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</button>)}</div>
      <form role="search" onSubmit={submitSearch}><label className="sr-only" htmlFor="community-search">여행 후기 검색</label><input id="community-search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={80} placeholder="관광지, 지역, 제목 검색" /><button type="submit">검색</button></form>
    </div>
  </>;
}
