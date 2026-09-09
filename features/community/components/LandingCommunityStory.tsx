import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";

/** Read-only composition of the existing CommunityEditor fields; no fabricated posts/users. */
export default function LandingCommunityStory() {
  const en = useSitePreferences().locale === "en";
  return <section className="landing-community community-chapter" id="community" data-cinematic="left" aria-labelledby="community-story-title">
    <figure className="community-composer-visual" aria-labelledby="community-visual-caption">
      <div className="community-editor-preview">
        <div className="community-preview-masthead"><span>W.A.V.E</span><span>{en ? "Traveler stories" : "여행 후기"}</span></div>
        <p className="section-kicker">{en ? "A place, an experience" : "장소에 남기는 나의 경험"}</p>
        <h3>{en ? "Share your journey." : "어떤 여행이었나요?"}</h3>
        <div className="community-place-tag"><span aria-hidden="true">⌖</span>{en ? "Connect a place from your trip" : "여행한 장소 연결"}</div>
        <dl className="community-preview-fields">
          <div><dt>{en ? "Title" : "제목"}</dt><dd>{en ? "Your experience or question" : "직접 겪은 경험이나 궁금한 점"}</dd></div>
          <div><dt>{en ? "Visit" : "방문"}</dt><dd>{en ? "Visit date · region" : "방문 날짜 · 지역"}</dd></div>
          <div><dt>{en ? "Field report" : "현장 확인"}</dt><dd>{en ? "Access path · parking · toilet" : "접근로 · 주차 · 화장실"}</dd></div>
        </dl>
        <p className="community-preview-note">{en ? "Visitor experiences are kept separate from official records." : "여행자 경험은 공식 정보와 구분해요."}</p>
      </div>
      <figcaption id="community-visual-caption">{en ? "W.A.V.E review form example · not a published review" : "W.A.V.E 후기 작성 화면 예시 · 실제 게시된 후기가 아닙니다"}</figcaption>
    </figure>
    <div className="landing-community-copy">
      <p className="section-kicker">{en ? "Your experience travels further" : "여행의 끝에서, 다음 여행으로"}</p>
      <h2 id="community-story-title">{en ? "Your experience." : "당신의 경험이,"}<br /><em>{en ? "Someone else's next step." : "누군가의 첫걸음으로."}</em></h2>
      <p>{en ? "Share what you experienced and ask what you need to know, connected to the place." : "다녀온 장소의 경험을 나누고, 떠나기 전 궁금한 점을 물어보세요."}</p>
      <Link href="/community">{en ? "Visit the community" : "커뮤니티 보기"} <span aria-hidden="true">↗</span></Link>
    </div>
  </section>;
}
