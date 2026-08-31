"use client";

import CommunityHeader from "../../../components/CommunityHeader";
import { useCommunityBoard, type PlaceFilter } from "../hooks/useCommunityBoard";
import CommunityBoardToolbar from "./CommunityBoardToolbar";
import CommunityHero from "./CommunityHero";
import CommunityPostList from "./CommunityPostList";

export default function CommunityPage({ initialPlace = null }: { initialPlace?: PlaceFilter | null }) {
  const board = useCommunityBoard(initialPlace);
  return <main className="community-page">
    <a className="skip-link" href="#community-list">게시글 목록으로 바로가기</a>
    <CommunityHeader />
    <CommunityHero />
    <section className="community-workspace" id="community-list" aria-labelledby="community-list-title">
      <CommunityBoardToolbar board={board} />
      <CommunityPostList board={board} />
    </section>
    <footer className="community-footer"><strong>W.A.V.E</strong><p>제목과 배지에 ‘샘플’이 붙은 글은 기능 확인용이며 실제 여행자 경험이 아닙니다. 여행자 현장 제보는 공식 관광·접근성 근거와 분리해 표시합니다.</p><a href="/planner">여행 설계로 돌아가기 →</a></footer>
  </main>;
}
