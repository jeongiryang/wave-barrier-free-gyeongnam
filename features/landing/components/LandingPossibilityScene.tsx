"use client";

import { useSitePreferences } from "../../../components/SitePreferences";
import StoryMedia from "./StoryMedia";

export default function LandingPossibilityScene() {
  const en = useSitePreferences().locale === "en";
  return <section className="possibility-scene" data-cinematic="left" aria-labelledby="possibility-title">
    <div className="possibility-copy" data-land-reveal>
      <p className="section-kicker">{en ? "A day worth imagining" : "함께 그리는 다음 여행"}</p>
      <h2 id="possibility-title">{en ? "Different ways to move." : "걷는 속도는 달라도,"}<br /><em>{en ? "A day to share." : "함께 머무는 하루."}</em></h2>
      <p>{en ? "A garden to wander through. A pause by the sea. Your own needs are the starting point." : "산책하고 싶은 정원, 잠깐 쉬어 갈 바닷가. 내게 필요한 편의를 살피는 것부터 여행이 시작돼요."}</p>
      <a href="#journey-scene-title">{en ? "See a real travel plan" : "실제 여행 계획 살펴보기"} <span aria-hidden="true">↓</span></a>
    </div>
    <StoryMedia kind="film"><span className="story-film-caption">{en ? "An imagined day together" : "우리의 여행이 시작되는 장면"}</span></StoryMedia>
  </section>;
}
