"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import { useCommunityDetail } from "../hooks/useCommunityDetail";
import CommunityComments from "./CommunityComments";
import CommunityPostArticle from "./CommunityPostArticle";

export default function CommunityDetail({ postId }: { postId: string }) {
  const detail = useCommunityDetail(postId);
  const { post, state, message, load } = detail;
  if (state === "loading") return <div className="community-detail-state" role="status" aria-live="polite"><i /><b>여행자 이야기를 불러오는 중</b></div>;
  if (state === "error" || !post) return <div className="community-detail-state" role="alert"><b>게시글을 열지 못했습니다.</b><p>{message}</p><button type="button" onClick={() => void load()}>다시 시도</button><a href="/community">목록으로 돌아가기</a></div>;
  return <article className="community-detail">
    <CommunityPostArticle detail={detail} />
    <CommunityComments detail={detail} />
  </article>;
}
