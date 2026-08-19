import type { Metadata } from "next";
import CommunityDetail from "../../../components/CommunityDetail";
import CommunityHeader from "../../../components/CommunityHeader";

export const metadata: Metadata = { title: "여행자 이야기" };

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="community-page community-detail-page"><a className="skip-link" href="#community-post">게시글로 바로가기</a><CommunityHeader /><section id="community-post"><CommunityDetail postId={id} /></section></main>;
}
