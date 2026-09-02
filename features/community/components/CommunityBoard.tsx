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
    <footer className="community-footer"><strong>W.A.V.E</strong><p>여행자 후기는 작성자 한 명의 경험이며 공식 관광·접근성 정보와 분리해 표시합니다. 출발 전에는 운영기관의 최신 안내를 다시 확인해 주세요.</p><a href="/planner">여행 설계로 돌아가기 →</a></footer>
  </main>;
}
