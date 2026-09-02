import CommunityHeader from "../../../components/CommunityHeader";
import CommunityModerationQueue from "../../../features/community/components/CommunityModerationQueue";
import SkipLink from "../../../components/SkipLink";
import { pageMetadata } from "../../../lib/site-metadata";

export const metadata = pageMetadata({
  title: "커뮤니티 운영",
  description: "W.A.V.E 커뮤니티 신고와 공개 상태를 확인하는 운영 화면입니다.",
  path: "/community/moderation",
  index: false,
});

export default function CommunityModerationPage() {
  return <main className="community-page community-detail-page"><SkipLink href="#moderation">운영 목록으로 바로가기</SkipLink><CommunityHeader /><div id="moderation"><CommunityModerationQueue /></div></main>;
}
