"use client";
import Link from "next/link";
import { useStoryPlayback } from "../../landing/hooks/useStoryPlayback";
import { COMMUNITY_CATEGORY_LABELS } from "../../../lib/community/types";
import { useSitePreferences } from "../../../components/SitePreferences";

/** Read-only composition of the existing CommunityEditor fields; no fabricated posts/users. */
export default function LandingCommunityStory() {
  const en = useSitePreferences().locale === "en";
  const { root, index: step, running, still } = useStoryPlayback(4, 1400);
  const title = en ? "A question before a Gyeongnam trip" : "경남 여행을 앞두고 궁금해요";
  const content = en ? "What should I check about paths and facilities before leaving?" : "출발 전에 접근로와 편의시설에서 무엇을 살펴보면 좋을까요?";
  return <section className="landing-community community-chapter" id="community" tabIndex={-1} data-cinematic="left" aria-labelledby="community-story-title">
    <img className="community-journal-backdrop" src="/media/wave-story/travel-journal-v2.webp" width="1536" height="1024" loading="lazy" decoding="async" alt="" />
    <figure className="community-composer-visual" aria-labelledby="community-visual-caption">
      <div ref={root} className="community-demo story-demo" data-demo="community" data-step={step} data-running={running} data-still={still}>
        <div className="community-editor-preview" aria-hidden="true">
          <div className="community-preview-masthead"><span>W.A.V.E</span><span aria-hidden="true">↗</span></div>
          <p className="section-kicker">{en ? "Write a question" : COMMUNITY_CATEGORY_LABELS.general}</p>
          <h3>{en ? "A question becomes" : "궁금함이"}<br /><em>{en ? "a conversation." : "이야기가 되는 곳."}</em></h3>
          <div className="community-entry-fields">
            <div className="demo-input"><small>{en ? "Region" : "지역"}</small><b>{en ? "Changwon" : "창원"}</b></div>
            <div className="demo-input"><small>{en ? "Title" : "제목"}</small><div className="demo-typed" data-filled={step >= 1}><span>{title}</span></div></div>
            <div className="demo-input"><small>{en ? "Content" : "내용"}</small><div className="demo-typed" data-filled={step >= 2}><span>{content}</span></div></div>
          </div>
          <article className="demo-post-preview" data-shown={step >= 3}><small>{en ? "Travel questions · Changwon" : "여행 질문 · 창원"}</small><h4>{title}</h4><p>{content}</p></article>
        </div>
        <p className="sr-only">{en ? "Travel questions connect a region, a title and your question." : "여행 질문에는 지역, 제목, 궁금한 내용을 담을 수 있어요."} {title}. {content}</p>
      </div>
      <figcaption className="sr-only" id="community-visual-caption">{en ? "Ask about your trip" : "여행을 앞두고 궁금한 점을 나누세요"}</figcaption>
    </figure>
    <div className="landing-community-copy">
      <p className="section-kicker">{en ? "Your experience travels further" : "여행의 끝에서, 다음 여행으로"}</p>
      <h2 id="community-story-title">{en ? "Your experience." : "당신의 경험이,"}<br /><em>{en ? "Someone else's next step." : "누군가의 첫걸음으로."}</em></h2>
      <p>{en ? "Share what you experienced and ask what you need to know, connected to the place." : "다녀온 장소의 경험을 나누고, 떠나기 전 궁금한 점을 물어보세요."}</p>
      <Link href="/community">{en ? "Visit the community" : "커뮤니티 보기"} <span aria-hidden="true">↗</span></Link>
    </div>
  </section>;
}
