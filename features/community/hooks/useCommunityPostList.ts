"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CommunityPost } from "../../../lib/community/types";
import { listCommunityPosts } from "../client/api";

export function useCommunityPostList({ category, query, placeId }: { category: string; query: string; placeId?: string }) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const requestRef = useRef<AbortController | null>(null);

  const load = useCallback(async (nextPage = 1) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState("loading");
    setMessage("");
    const timer = window.setTimeout(() => controller.abort(), 12000);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: "12" });
      if (category) params.set("category", category);
      if (query) params.set("search", query);
      if (placeId) params.set("placeId", placeId);
      const payload = await listCommunityPosts(params, controller.signal);
      if (requestRef.current !== controller) return;
      setPosts(payload.posts || []);
      setPage(nextPage);
      setHasMore(Boolean(payload.hasMore));
      setState("ready");
    } catch (error) {
      if (requestRef.current !== controller) return;
      setMessage(error instanceof DOMException && error.name === "AbortError"
        ? "여행자 이야기를 불러오는 데 시간이 걸리고 있습니다. 다시 시도해 주세요."
        : error instanceof Error ? error.message : "목록을 불러오지 못했습니다.");
      setState("error");
    } finally {
      window.clearTimeout(timer);
      if (requestRef.current === controller) requestRef.current = null;
    }
  }, [category, placeId, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1), 0);
    return () => {
      window.clearTimeout(timer);
      requestRef.current?.abort();
    };
  }, [load]);

  return { posts, page, hasMore, state, message, load };
}
