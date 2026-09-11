"use client";

import { useRef } from "react";
import Link from "next/link";
import EditorialPhoto from "../../landing/components/EditorialPhoto";
import { travelStories } from "../travel-stories";

export default function CommunityTravelStories() {
  const rail = useRef<HTMLDivElement>(null);
  function move(direction: number) {
    const element = rail.current;
    if (!element) return;
    const card = element.firstElementChild;
    const gap = parseFloat(getComputedStyle(element).columnGap) || 0;
    element.scrollBy({ left: direction * ((card?.getBoundingClientRect().width || element.clientWidth) + gap), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return <section className="community-travel-stories" aria-labelledby="wave-stories-title"><header><h2 id="wave-stories-title">다음 여행을 여는 이야기</h2><div className="community-story-controls"><button type="button" aria-label="이전 여행 이야기" aria-controls="wave-story-cards" onClick={() => move(-1)}>←</button><button type="button" aria-label="다음 여행 이야기" aria-controls="wave-story-cards" onClick={() => move(1)}>→</button></div></header><div id="wave-story-cards" className="community-editorial-grid" ref={rail}>{travelStories.map(story => <article key={story.slug}><EditorialPhoto photo={story.photo} /><div><small>{story.region} · {story.category}</small><h3><Link href={`/community/stories/${story.slug}`}>{story.title}</Link></h3><p>{story.summary}</p><Link className="community-story-read" href={`/community/stories/${story.slug}`} aria-label={`${story.title} 읽기`}>이야기 읽기 <span aria-hidden="true">↗</span></Link><span className="community-story-author">WAVE</span></div></article>)}</div></section>;
}
