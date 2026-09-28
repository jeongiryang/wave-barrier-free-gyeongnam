import LandingChatPreview from './LandingChatPreview';


export default function LandingRestoredConversation() {
  return <section className="landing-restored-conversation" aria-label="나루와 함께 여행 준비하기">
    <div className="restored-story"><img src="/naru/wave-travel-story.webp" alt="밤바다에서 함께 지도를 살펴보는 꼬마여행자와 나루" width="1536" height="1024" loading="lazy"/><div className="restored-conversation-intro"><h2>나루와 이야기하며,<br/>우리 여행을 만들어봐요</h2><p>가고 싶은 곳과 필요한 도움을 편하게 말해 주세요.</p></div></div>
    <LandingChatPreview framed />
  </section>;
}
