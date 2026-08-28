"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listCommunityPosts } from "../../community/client/api";
import type { CommunityPost } from "../../../lib/community/types";
import type { Place } from "../types";

export default function PlaceCommunityStories({ place, location }: { place: Place; location: string }) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const exact = new URLSearchParams({ placeId: place.id, page: "1", limit: "3" });
        const exactResult = await listCommunityPosts(exact, controller.signal);
        let next = exactResult.posts || [];
        if (!next.length && location) {
          const regional = new URLSearchParams({ search: location, page: "1", limit: "3" });
          next = (await listCommunityPosts(regional, controller.signal)).posts || [];
        }
        if (active) setPosts(next.slice(0, 3));
      } catch {
        if (!controller.signal.aborted && active) setPosts([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [location, place.id]);

  if (loading) return <div className="place-community-stories is-loading" role="status">W.A.V.E 커뮤니티 이야기를 확인하고 있어요.</div>;
  if (!posts.length) return null;

  return <section className="place-community-stories" aria-labelledby="place-community-title">
    <header><div><small>W.A.V.E COMMUNITY</small><h3 id="place-community-title">이 장소·지역의 여행자 이야기</h3></div><Link href={`/community?placeId=${encodeURIComponent(place.id)}&placeName=${encodeURIComponent(place.name)}&region=${encodeURIComponent(location)}`}>전체 보기 →</Link></header>
    <div className="place-community-story-list">
      {posts.map((post) => <Link key={post.id} href={`/community/${encodeURIComponent(post.id)}`}>
        <span>{post.region || location}</span>
        <strong>{post.title}</strong>
        <small>{post.authorName} · 댓글 {post.commentCount} · 좋아요 {post.likeCount}</small>
      </Link>)}
    </div>
  </section>;
}
