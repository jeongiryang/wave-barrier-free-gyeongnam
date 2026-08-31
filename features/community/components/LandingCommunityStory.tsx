"use client";

import Link from "next/link";
import { COMMUNITY_CATEGORY_LABELS } from "../../../lib/community/types";
import { useCommunityPreview } from "../hooks/useCommunityPreview";

export default function LandingCommunityStory() {
  const { posts, loaded } = useCommunityPreview();
  return (
    <section className="landing-community" id="community" data-land-reveal>
      <div className="landing-community-copy"><p className="section-kicker">여행 후기</p><h2>직접 다녀온 경험이<br /><em>다음 여행의 참고로.</em></h2><p>관광지와 지역에 연결된 질문과 후기를 읽고 나눕니다. 공식 관광 데이터와 사용자 경험은 섞지 않고 서로 다른 출처로 분명하게 표시합니다.</p><div><Link href="/community">여행 후기 보기 <span>→</span></Link><Link href="/login?next=%2Fcommunity%2Fnew">후기 작성</Link></div></div>
      <div className="community-live-preview" aria-live="polite"><header><span><i /> W.A.V.E 여행 후기</span><small>{loaded ? "실제 등록된 글" : "불러오는 중"}</small></header>{posts.length ? posts.map((post) => <Link key={post.id} href={`/community/${post.id}`}><span>{COMMUNITY_CATEGORY_LABELS[post.category]}</span><h3>{post.title}</h3><p>{post.content}</p><footer><b>{post.region || "경남 여행"}{post.placeName ? ` · ${post.placeName}` : ""}</b><small>댓글 {post.commentCount} · 좋아요 {post.likeCount}</small></footer></Link>) : <div className="community-preview-empty"><span aria-hidden="true">≈</span><strong>첫 여행 후기를 기다리고 있어요.</strong><p>실제 사용자가 작성한 글만 표시하며 예시 사용자를 만들어 채우지 않습니다.</p></div>}</div>
    </section>
  );
}
