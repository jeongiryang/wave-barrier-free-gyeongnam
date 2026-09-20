"use client";

import type { CommunityLayout } from "../view-layout";
import Link from "next/link";
import EditorialPhoto from "../../landing/components/EditorialPhoto";
import { travelStories } from "../travel-stories";

export default function CommunityTravelStories({ layout }: { layout: CommunityLayout }) {
  return <section className="community-travel-stories" aria-labelledby="wave-stories-title"><header><h2 id="wave-stories-title">여행 준비 가이드</h2></header><div id="wave-story-cards" className="community-editorial-grid" data-layout={layout}>{travelStories.map(story => <article key={story.slug}><EditorialPhoto photo={story.photo} /><div><small>{story.region} · {story.category}</small><h3><Link href={`/community/stories/${story.slug}`}>{story.title}</Link></h3><p>{story.summary}</p><Link className="community-story-read" href={`/community/stories/${story.slug}`} aria-label={`${story.title} 읽기`}>이야기 읽기 <span aria-hidden="true">↗</span></Link><span className="community-story-author">WAVE</span></div></article>)}</div></section>;
}
