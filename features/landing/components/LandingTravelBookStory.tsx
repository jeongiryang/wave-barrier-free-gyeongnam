import CompactJourneyVisual from "./CompactJourneyVisual";
import { useSitePreferences } from "../../../components/SitePreferences";

export default function LandingTravelBookStory() {
  const en = useSitePreferences().locale === "en";
  return <article className="product-story travel-book-story reverse" data-land-reveal>
    <CompactJourneyVisual stage="save" />
    <div className="product-story-copy">
      {en ? <p className="section-kicker">06 · Keep your trip</p> : <p className="section-kicker">06 · 내 일정</p>}
      <h2>{en ? "Keep your itinerary." : "만든 일정은"}<br /><em>{en ? "Come back to it." : "다시 이어서 보세요."}</em></h2>
      <p>{en ? "Save your trips. Return to upcoming journeys or look back at places you have visited." : "일정을 보관하고, 갈 여행과 다녀온 여행을 나눠 확인하세요."}</p>
      <a href="/travel-book">{en ? "Open saved trips" : "저장한 일정 보기"} <span aria-hidden="true">→</span></a>
    </div>
    <div className="product-preview travel-book-preview feature-motion" role="img" aria-label="저장한 창원 여행이 갈 여행에서 다녀온 여행과 현장 기록으로 이어지는 흐름">
      <div className="feature-preview-stage" aria-hidden="true">
        <header><span><small>내 여행집</small><strong>창원 3곳 여행</strong></span><b>여행의 기억</b></header>
        <div className="travel-book-preview-cover motion-book-cover"><i>01</i><span className="motion-book-status">갈 여행</span></div>
        <ol><li className="motion-book-day book-day-one"><span>첫째 날</span><strong>나에게 맞는 장소 2곳</strong><small>오전 10:00 시작</small></li><li className="motion-book-day book-day-two"><span>둘째 날</span><strong>여유 있게 둘러볼 장소 1곳</strong><small>메모와 함께 보관</small></li></ol>
        <footer><span className="motion-book-complete">다녀온 여행으로 바꾸기</span><b>사진 코스 · 후기</b></footer>
      </div>
    </div>
  </article>;
}
