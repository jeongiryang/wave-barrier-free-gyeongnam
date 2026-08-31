import type { Metadata } from "next";
import CommunityEditor from "../../../../features/community/components/CommunityEditor";
import CommunityHeader from "../../../../components/CommunityHeader";

export const metadata: Metadata = { title: "여행 후기 수정", robots: { index: false, follow: false } };

export default async function EditCommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="community-page community-form-page"><a className="skip-link" href="#community-editor">글 입력으로 바로가기</a><CommunityHeader /><section id="community-editor"><CommunityEditor postId={id} /></section></main>;
}
