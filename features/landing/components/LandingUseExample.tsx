import LandingChatPreview from './LandingChatPreview';

export default function LandingUseExample() {
  return <section className="wave-use-example wave-use-example--immersive" aria-label="나루와 함께 준비하는 여행">
    <div className="wave-brand-story"><img src="/naru/wave-travel-story.webp" alt="밤바다를 바라보며 함께 여행 지도를 살펴보는 꼬마 여행자와 나루의 일러스트" width="1536" height="1024" loading="lazy" />
    </div>
    <LandingChatPreview />
  </section>;
}
