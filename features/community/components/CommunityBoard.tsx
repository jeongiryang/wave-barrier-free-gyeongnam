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
    <footer className="community-footer"><strong>W.A.V.E</strong><p>커뮤니티에는 W.A.V.E 사용자가 직접 작성한 경험이 표시됩니다. 공식 관광·접근성 정보는 여행 설계 화면에서 별도로 확인해 주세요.</p><a href="/planner">여행 설계로 돌아가기 →</a></footer>
  </main>;
}
