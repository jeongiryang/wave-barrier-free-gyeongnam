import Link from "next/link";
import { notFound } from "next/navigation";
import CommunityHeader from "../../../../components/CommunityHeader";
import SkipLink from "../../../../components/SkipLink";
import EditorialPhoto from "../../../../features/landing/components/EditorialPhoto";
import { travelStories } from "../../../../features/community/travel-stories";
import { pageMetadata } from "../../../../lib/site-metadata";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = travelStories.find(item => item.slug === slug);
  return pageMetadata({ title: story?.title || "여행 이야기", description: story?.summary || "WAVE 여행노트", path: `/community/stories/${encodeURIComponent(slug)}` });
}

export default async function TravelStoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = travelStories.find(item => item.slug === slug);
  if (!story) notFound();
  return <main className="community-page"><SkipLink href="#travel-story">이야기 본문으로 바로가기</SkipLink><CommunityHeader /><article className="community-travel-article" id="travel-story"><Link href="/community">← 커뮤니티</Link><header><p>WAVE 여행노트 · {story.category}</p><h1>{story.title}</h1><p>{story.summary}</p><span>WAVE · {story.region}</span></header><EditorialPhoto photo={story.photo} /><div className="community-article-body">{story.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div><footer><Link href={`/planner${story.region === "경남" ? "" : `?region=${encodeURIComponent(story.region)}`}`}>나의 여행 설계하기 ↗</Link><Link href="/community">다른 이야기 둘러보기 →</Link></footer></article></main>;
}
