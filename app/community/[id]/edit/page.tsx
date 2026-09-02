import CommunityEditor from "../../../../features/community/components/CommunityEditor";
import CommunityHeader from "../../../../components/CommunityHeader";
import SkipLink from "../../../../components/SkipLink";
import { pageMetadata } from "../../../../lib/site-metadata";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return pageMetadata({
    title: "여행 후기 수정",
    description: "작성한 W.A.V.E 여행 후기를 수정합니다.",
    path: `/community/${encodeURIComponent(id)}/edit`,
    index: false,
  });
}

export default async function EditCommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="community-page community-form-page"><SkipLink href="#community-editor">글 입력으로 바로가기</SkipLink><CommunityHeader /><section id="community-editor"><CommunityEditor postId={id} /></section></main>;
}
