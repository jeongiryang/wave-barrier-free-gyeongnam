import Link from "next/link";

const communityFeatureExamples = [
  {
    label: "기능 예시 · 여행 질문",
    title: "휠체어로 둘러보기 전 무엇을 확인할까요?",
    copy: "장애인 주차·접근로·화장실처럼 출발 전에 확인할 항목을 장소와 함께 묻고 답하는 화면입니다.",
    context: "창원 · 장소 연결 예시",
  },
  {
    label: "샘플 · 여행 후기",
    title: "걷기 부담을 줄인 하루 동선",
    copy: "쉬어 갈 곳과 이동 거리를 중심으로 여행 경험을 기록하고, 공식 편의정보와는 별도로 표시하는 예시입니다.",
    context: "경남 여행 · 후기 예시",
  },
] as const;

export default function LandingCommunityStory() {
  return (
    <section className="landing-community" id="community" aria-labelledby="community-story-title" data-land-reveal>
      <div className="landing-community-copy"><p className="section-kicker">여행 후기</p><h2 id="community-story-title">직접 다녀온 경험이<br /><em>다음 여행의 참고로.</em></h2><p>관광지와 지역에 연결된 질문과 후기를 읽고 나눕니다. 공식 관광 데이터와 사용자 경험은 섞지 않고 서로 다른 출처로 분명하게 표시합니다.</p><div><Link href="/community">실제 커뮤니티 보기 <span>→</span></Link><Link href="/login?next=%2Fcommunity%2Fnew">후기 작성</Link></div></div>
      <div className="community-live-preview community-feature-preview" role="region" aria-labelledby="community-preview-title" aria-describedby="community-preview-note">
        <header><span id="community-preview-title"><i aria-hidden="true" /> 커뮤니티 기능 예시</span><small id="community-preview-note">샘플 화면 · 실제 게시글 아님</small></header>
        <div className="community-feature-list" role="list" aria-label="커뮤니티 기능 예시 목록">
          {communityFeatureExamples.map((example) => <article className="community-feature-card" role="listitem" key={example.title}>
            <span>{example.label}</span>
            <h3>{example.title}</h3>
            <p>{example.copy}</p>
            <footer><b>{example.context}</b><small>기능 예시</small></footer>
          </article>)}
        </div>
      </div>
    </section>
  );
}
