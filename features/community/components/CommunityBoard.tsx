"use client";
import DemoStories from "../../demo/DemoStories";
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

export default function CommunityPage({ initialPlace = null, fieldReportsEnabled = false }: { initialPlace?: PlaceFilter | null; fieldReportsEnabled?: boolean }) {
  const board = useCommunityBoard(initialPlace);
  const [layout, setLayout] = useState<CommunityLayout>("cards");
  return <main className="community-page">
    <SkipLink href="#community-list">게시글 목록으로 바로가기</SkipLink>
    <CommunityHeader />
    <CommunityHero writeHref={board.writeHref} />

    <section className="community-workspace" id="community-list" aria-labelledby="community-list-title">
      <CommunityBoardToolbar board={board} layout={layout} onLayout={setLayout} fieldReportsEnabled={fieldReportsEnabled} />
      {fieldReportsEnabled && <p className="community-field-report-notice">여행자가 직접 확인한 내용이에요. W.A.V.E가 확인한 정보가 아니에요.</p>}
      {fieldReportsEnabled && board.placeFilter && <a className="community-field-report-write" href={board.fieldReportWriteHref}>이 관광지에서 확인한 정보 남기기</a>}
      <p className="community-evidence-note">여행자 후기는 작성자 한 명의 경험이며 공식 관광·접근성 정보와 구분합니다.</p>
      <CommunityPostList board={board} layout={layout} />
      {!board.placeFilter && !board.category && !board.query && board.page === 1 && <><details className="community-guides"><summary>시연용 게시글 보기</summary><DemoStories /></details><details className="community-guides"><summary>이용 가이드</summary><CommunityTravelStories layout={layout} /></details></>}
    </section>
    <SiteFooter />
  </main>;
}
