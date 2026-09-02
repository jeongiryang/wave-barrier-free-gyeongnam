"use client";

import CommunityHeader from "../../../components/CommunityHeader";
import SkipLink from "../../../components/SkipLink";
import { useCommunityBoard, type PlaceFilter } from "../hooks/useCommunityBoard";
import CommunityBoardToolbar from "./CommunityBoardToolbar";
import CommunityHero from "./CommunityHero";
import CommunityPostList from "./CommunityPostList";

export default function CommunityPage({ initialPlace = null }: { initialPlace?: PlaceFilter | null }) {
  const board = useCommunityBoard(initialPlace);
  return <main className="community-page">
    <SkipLink href="#community-list">게시글 목록으로 바로가기</SkipLink>
    <CommunityHeader />
    <CommunityHero />
    <section className="community-workspace" id="community-list" aria-labelledby="community-list-title">
      <CommunityBoardToolbar board={board} />
      <CommunityPostList board={board} />
    </section>
    <footer className="community-footer"><strong>W.A.V.E</strong><p>제목과 배지에 ‘샘플’이 붙은 글은 이용 예시이며 실제 여행자가 작성한 글이 아닙니다. 여행자 현장 제보는 공식 관광·접근성 근거와 분리해 표시합니다.</p><a href="/planner">여행 설계로 돌아가기 →</a></footer>
  </main>;
}
