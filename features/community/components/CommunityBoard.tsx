"use client";
import type { CommunityLayout } from "../view-layout";

import { useState } from "react";
import CommunityHeader from "../../../components/CommunityHeader";
import SiteFooter from "../../../components/SiteFooter";
import SkipLink from "../../../components/SkipLink";
import { useCommunityBoard, type PlaceFilter } from "../hooks/useCommunityBoard";
import CommunityBoardToolbar from "./CommunityBoardToolbar";
import CommunityHero from "./CommunityHero";
import CommunityPostList from "./CommunityPostList";
import CommunityTravelStories from "./CommunityTravelStories";

export default function CommunityPage({ initialPlace = null }: { initialPlace?: PlaceFilter | null }) {
  const board = useCommunityBoard(initialPlace);
  const [layout, setLayout] = useState<CommunityLayout>("cards");
  return <main className="community-page">
    <SkipLink href="#community-list">게시글 목록으로 바로가기</SkipLink>
    <CommunityHeader />
    <CommunityHero writeHref={board.writeHref} />

    <section className="community-workspace" id="community-list" aria-labelledby="community-list-title">
      <CommunityBoardToolbar board={board} layout={layout} onLayout={setLayout} />
      <p className="community-evidence-note">여행자 후기는 작성자 한 명의 경험이며 공식 관광·접근성 정보와 구분합니다.</p>
      <CommunityPostList board={board} layout={layout} />
      {!board.placeFilter && !board.category && !board.query && board.page === 1 && <details className="community-guides"><summary>이용 가이드</summary><CommunityTravelStories layout={layout} /></details>}
    </section>
    <SiteFooter />
  </main>;
}
