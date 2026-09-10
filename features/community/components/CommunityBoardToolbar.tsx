import { COMMUNITY_CATEGORY_LABELS } from "../../../lib/community/types";
import type { useCommunityBoard } from "../hooks/useCommunityBoard";

export default function CommunityBoardToolbar({ board, layout, onLayout }: { board: ReturnType<typeof useCommunityBoard>; layout: "cards" | "list"; onLayout: (layout: "cards" | "list") => void }) {
  const { category, setCategory, search, setSearch, placeFilter, setPlaceFilter, submitSearch } = board;
  return <>
    <h2 id="community-list-title" className="sr-only">여행 후기와 질문</h2>
    {placeFilter && <aside className="community-place-filter" aria-label="관광지 필터"><span><small>지금 보고 있는 관광지</small><strong>{placeFilter.region ? `${placeFilter.region} · ` : ""}{placeFilter.name}</strong></span><button type="button" onClick={() => setPlaceFilter(null)}>전체 후기 보기</button></aside>}
    <div className="community-controls">
      <div className="community-tabs" role="group" aria-label="게시판 선택">{[["", "전체"], ...Object.entries(COMMUNITY_CATEGORY_LABELS)].map(([value, label]) => <button key={value || "all"} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</button>)}</div>
      <form role="search" onSubmit={submitSearch}><label className="sr-only" htmlFor="community-search">여행 후기 검색</label><input id="community-search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={80} placeholder="관광지, 지역, 제목 검색" /><button type="submit">검색</button></form>
      <div className="community-layout-switch" role="group" aria-label="게시글 보기 방식"><button type="button" aria-pressed={layout === "cards"} onClick={() => onLayout("cards")}>카드</button><button type="button" aria-pressed={layout === "list"} onClick={() => onLayout("list")}>목록</button></div>
    </div>
  </>;
}
