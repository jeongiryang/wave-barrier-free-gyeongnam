import Link from "next/link";

const communityFeatures = [
  {
    label: "장소별 여행 질문",
    title: "궁금한 점을 장소에 연결합니다.",
    copy: "장애인 주차·접근로·화장실처럼 출발 전에 확인할 항목을 해당 장소와 함께 묻고 답합니다.",
    context: "창원 · 장소와 연결",
    action: "질문으로 확인",
  },
  {
    label: "동선 중심 여행 후기",
    title: "직접 겪은 이동 경험을 남깁니다.",
    copy: "쉬어 갈 곳과 이동 거리를 중심으로 여행 경험을 기록하고, 공식 편의정보와 구분해 보여줍니다.",
    context: "경남 여행 · 이용자 경험",
    action: "후기로 기록",
  },
] as const;

export default function LandingCommunityStory() {
  return (
    <section className="landing-community" id="community" aria-labelledby="community-story-title" data-land-reveal>
      <div className="landing-community-copy"><p className="section-kicker">여행 후기</p><h2 id="community-story-title">직접 다녀온 경험이<br /><em>다음 여행의 참고로.</em></h2><p>관광지와 지역에 연결된 질문과 후기를 읽고 나눕니다. 공식 관광 데이터와 사용자 경험은 섞지 않고 서로 다른 출처로 분명하게 표시합니다.</p><div><Link href="/community">실제 커뮤니티 보기 <span>→</span></Link><Link href="/login?next=%2Fcommunity%2Fnew">후기 작성</Link></div></div>
      <div className="community-live-preview community-feature-preview" role="region" aria-labelledby="community-preview-title" aria-describedby="community-preview-note">
        <header><span id="community-preview-title"><i aria-hidden="true" /> 커뮤니티 이용 흐름</span><small id="community-preview-note">공식 정보와 이용자 경험을 구분해 표시</small></header>
        <div className="community-feature-list" role="list" aria-label="커뮤니티 주요 기능">
          {communityFeatures.map((feature) => <article className="community-feature-card" role="listitem" key={feature.title}>
            <span>{feature.label}</span>
            <h3>{feature.title}</h3>
            <p>{feature.copy}</p>
            <footer><b>{feature.context}</b><small>{feature.action}</small></footer>
          </article>)}
        </div>
      </div>
    </section>
  );
}
