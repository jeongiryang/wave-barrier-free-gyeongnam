"use client";
import NightIcon from '../../../components/NightIcon';


import Link from "next/link";
import { useCommunityDetail } from "../hooks/useCommunityDetail";
import CommunityComments from "./CommunityComments";
import CommunityPostArticle from "./CommunityPostArticle";

export default function CommunityDetail({ postId }: { postId: string }) {
  const detail = useCommunityDetail(postId);
  const { post, state, message, load } = detail;
  if (state === "loading") return <div className="community-detail-state" role="status" aria-live="polite"><i /><b>여행자 이야기를 불러오는 중</b></div>;
  if (state === "error" || !post) return <div className="community-detail-state" role="alert"><b>게시글을 열지 못했습니다.</b><p>{message}</p><button type="button" onClick={() => void load()} data-icon-action="" title="다시 시도"><NightIcon name="refresh" size={20}/><span className="sr-only">다시 시도</span></button><Link href="/community">목록으로 돌아가기</Link></div>;
  return <article className="community-detail">
    <CommunityPostArticle detail={detail} />
    <CommunityComments detail={detail} />
  </article>;
}
