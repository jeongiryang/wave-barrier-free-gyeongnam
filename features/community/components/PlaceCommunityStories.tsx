"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CommunityPost } from "../../../lib/community/types";
import { listCommunityPosts } from "../client/api";

export default function PlaceCommunityStories({ placeId, placeName, region }: {
  placeId: string;
  placeName: string;
  region: string;
}) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const exactParams = new URLSearchParams({ placeId, limit: "3" });
        const exact = await listCommunityPosts(exactParams, controller.signal);
        let next = exact.posts || [];
        if (!next.length && region) {
          const regionalParams = new URLSearchParams({ search: region, limit: "3" });
          const regional = await listCommunityPosts(regionalParams, controller.signal);
          next = regional.posts || [];
        }
        if (!controller.signal.aborted) setPosts(next);
      } catch {
        if (!controller.signal.aborted) setPosts([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [placeId, region]);

  if (loading) return <div className="place-community-stories is-loading" role="status"><span>W.A.V.E 커뮤니티</span><p>{placeName} 주변 여행자 이야기를 확인하고 있어요.</p></div>;
  if (!posts.length) return null;

  return <section className="place-community-stories" aria-labelledby="place-community-title">
    <header><div><span>W.A.V.E COMMUNITY</span><h3 id="place-community-title">{region}을 먼저 다녀온 여행자 이야기</h3></div><Link href={`/community?search=${encodeURIComponent(region)}`}>더 보기 →</Link></header>
    <ul>{posts.map((post) => <li key={post.id}>
      <Link href={`/community/${post.id}`}>
        <small>{post.region || region} · {post.authorName}</small>
        <strong>{post.title}</strong>
        <p>{post.content.length > 90 ? `${post.content.slice(0, 90)}…` : post.content}</p>
        <span>댓글 {post.commentCount} · 공감 {post.likeCount}</span>
      </Link>
    </li>)}</ul>
    <p className="place-community-disclaimer">커뮤니티 글은 여행자가 남긴 경험이며 공식 편의정보와 별도로 확인해야 합니다.</p>
  </section>;
}
