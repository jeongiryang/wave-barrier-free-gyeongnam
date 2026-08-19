import type { Metadata } from "next";
import CommunityEditor from "../../../components/CommunityEditor";
import CommunityHeader from "../../../components/CommunityHeader";

export const metadata: Metadata = { title: "여행자 이야기 쓰기", robots: { index: false, follow: false } };

export default function NewCommunityPostPage() {
  return <main className="community-page community-form-page"><a className="skip-link" href="#community-editor">글 입력으로 바로가기</a><CommunityHeader /><section id="community-editor"><CommunityEditor /></section></main>;
}
