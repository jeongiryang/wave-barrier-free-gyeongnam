"use client";
import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";
import EditorialPhoto from "../../landing/components/EditorialPhoto";
import { horizonPhotos } from "../../landing/horizon-photos";

/** Destination photographs invite real contributions; no invented posts or authors. */
export default function LandingCommunityStory() {
  const en = useSitePreferences().locale === "en";
  return <section className="horizon-community" id="community" tabIndex={-1} aria-labelledby="community-story-title" data-cinematic="left">
    <div className="horizon-community-photos"><EditorialPhoto photo={horizonPhotos.park} /><EditorialPhoto photo={horizonPhotos.garden} /></div>
    <div className="horizon-community-copy" data-land-reveal>
      <p className="horizon-eyebrow">{en ? "BETWEEN US" : "우리 사이에 남는 여행"}</p>
      <h2 id="community-story-title">{en ? "The scene you share" : "당신이 남긴 장면이"}<br /><em>{en ? "starts another journey." : "다음 여행의 시작."}</em></h2>
      <p>{en ? "Share your experiences and your questions. Every conversation brings the next journey closer." : "다녀온 경험과 궁금한 이야기를 나눠보세요. 함께 알아갈수록 여행은 더 가까워져요."}</p>
      <Link href="/community" className="horizon-text-link">{en ? "Traveler stories" : "여행자의 이야기"}<span aria-hidden="true">↗</span></Link>
    </div>
  </section>;
}
