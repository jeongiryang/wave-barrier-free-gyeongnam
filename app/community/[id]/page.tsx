import CommunityDetail from "../../../features/community/components/CommunityDetail";
import CommunityHeader from "../../../components/CommunityHeader";
import SkipLink from "../../../components/SkipLink";
import { pageMetadata } from "../../../lib/site-metadata";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return pageMetadata({
    title: "여행자 후기",
    description: "공식 관광정보와 구분해 공유한 경남 여행자의 경험을 확인합니다.",
    path: `/community/${encodeURIComponent(id)}`,
  });
}

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="community-page community-detail-page"><SkipLink href="#community-post">게시글로 바로가기</SkipLink><CommunityHeader /><section id="community-post"><CommunityDetail postId={id} /></section></main>;
}
