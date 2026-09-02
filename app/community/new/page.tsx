import CommunityEditor from "../../../features/community/components/CommunityEditor";
import CommunityHeader from "../../../components/CommunityHeader";
import SkipLink from "../../../components/SkipLink";
import { pageMetadata } from "../../../lib/site-metadata";

export const metadata = pageMetadata({
  title: "여행 후기 작성",
  description: "경남 여행 경험과 관광지 편의정보를 W.A.V.E 여행자들과 나눕니다.",
  path: "/community/new",
  index: false,
});

export default function NewCommunityPostPage() {
  return <main className="community-page community-form-page"><SkipLink href="#community-editor">글 입력으로 바로가기</SkipLink><CommunityHeader /><section id="community-editor"><CommunityEditor /></section></main>;
}
