"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CommunityPost } from "../../../lib/community/types";
import { communityErrorMessage, isCommunityRequestError, listCommunityPosts } from "../client/api";

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
      if (isCommunityRequestError(error) && error.kind === "aborted") return;
      setMessage(communityErrorMessage(error, "목록을 불러오지 못했습니다."));
      setState("error");
    } finally {
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
