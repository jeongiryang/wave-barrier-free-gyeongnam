"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listCommunityPosts } from "../../community/client/api";
import type { CommunityPost } from "../../../lib/community/types";
import type { Place } from "../types";
import { useSitePreferences } from "../../../components/SitePreferences";
import { originalLanguage } from "../place-copy";

export default function PlaceCommunityStories({ place, location }: { place: Place; location: string }) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const say = (ko: string, english: string) => en ? english : ko;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      setLoading(true);
      setFailed(false);
      try {
        const exact = new URLSearchParams({ placeId: place.id, page: "1", limit: "3" });
        const exactResult = await listCommunityPosts(exact, controller.signal);
        if (!Array.isArray(exactResult.posts)) throw new Error("Invalid story list");
        const next = exactResult.posts;
        if (active) setPosts(next.slice(0, 3));
      } catch {
        if (!controller.signal.aborted && active) { setPosts([]); setFailed(true); }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [place.id, attempt]);

  return <section className="place-community-stories" aria-labelledby="place-community-title">
    <header><div><small>{say("W.A.V.E 커뮤니티 · 공식 점수 미반영", "W.A.V.E community · excluded from official scores")}</small><h3 id="place-community-title">{say("이 장소의 여행자 현장 이야기", "Visitor stories about this place")}</h3></div><Link href={`/community?placeId=${encodeURIComponent(place.id)}&placeName=${encodeURIComponent(place.name)}&region=${encodeURIComponent(location)}`}>{say("전체 보기 →", "View all →")}</Link></header>
    <div role="status">{loading ? say("W.A.V.E 커뮤니티 이야기를 확인하고 있어요.", "Loading visitor stories.") : failed ? say("현장 후기를 불러오지 못했습니다. 다시 시도해 주세요.", "We couldn't load visitor stories. Please try again.") : null}</div>
    {(failed || attempt > 0) && <button type="button" aria-disabled={loading} onClick={() => { if (!loading) { setLoading(true); setAttempt((value) => value + 1); } }}>{say("현장 후기 다시 확인", "Reload visitor stories")}</button>}
    {!loading && !failed && (posts.length ? <div className="place-community-story-list">
      {posts.map((post) => <Link key={post.id} href={`/community/${encodeURIComponent(post.id)}`}>
        <span>{post.visitDate ? `${say("방문", "Visited")} ${post.visitDate}` : say("방문일 미기재", "Visit date not supplied")}</span>
        <strong lang={originalLanguage(post.title)}>{post.title}</strong>
        <small><span lang={originalLanguage(post.authorName)}>{post.authorName}</span> · {say("현장 항목", "Reported fields")} {post.fieldReports?.length || 0} · {say("댓글", "Comments")} {post.commentCount}</small>
      </Link>)}
    </div> : <div className="place-community-empty"><p>{say("이 장소에 연결된 공개 현장 후기가 아직 없습니다.", "There are no public visitor stories linked to this place yet.")}</p><Link href={`/community/new?category=review&placeId=${encodeURIComponent(place.id)}&placeName=${encodeURIComponent(place.name)}&region=${encodeURIComponent(location)}`}>{say("첫 현장 후기 남기기", "Write the first visitor story")}</Link></div>)}
  </section>;
}
