import type { Metadata } from "next";
import CommunityHeader from "../../../components/CommunityHeader";
import CommunityModerationQueue from "../../../features/community/components/CommunityModerationQueue";

export const metadata: Metadata = {
  title: "커뮤니티 운영",
  robots: { index: false, follow: false },
};

export default function CommunityModerationPage() {
  return <main className="community-page community-detail-page"><a className="skip-link" href="#moderation">운영 목록으로 바로가기</a><CommunityHeader /><div id="moderation"><CommunityModerationQueue /></div></main>;
}
