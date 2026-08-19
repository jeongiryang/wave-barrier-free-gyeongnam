"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { authClient } from "../../../lib/auth/client";
import type { CommunityPost } from "../../../lib/community/types";
import { listCommunityPosts } from "../client/api";

export type PlaceFilter = { id: string; name: string; region: string };

export function useCommunityBoard(initialPlace: PlaceFilter | null) {
  const { data: session } = authClient.useSession();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter | null>(initialPlace);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async (nextPage = 1) => {
    setState("loading");
    setMessage("");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12000);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: "12" });
      if (category) params.set("category", category);
      if (query) params.set("search", query);
      if (placeFilter?.id) params.set("placeId", placeFilter.id);
      const payload = await listCommunityPosts(params, controller.signal);
      setPosts(payload.posts || []);
      setPage(nextPage);
      setHasMore(Boolean(payload.hasMore));
      setState("ready");
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError"
        ? "여행자 이야기를 불러오는 데 시간이 걸리고 있습니다. 다시 시도해 주세요."
        : error instanceof Error ? error.message : "목록을 불러오지 못했습니다.");
      setState("error");
    } finally {
      window.clearTimeout(timer);
    }
  }, [category, placeFilter, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const writeHref = useMemo(() => {
    const params = new URLSearchParams();
    if (placeFilter) {
      params.set("placeId", placeFilter.id);
      params.set("placeName", placeFilter.name);
      if (placeFilter.region) params.set("region", placeFilter.region);
    }
    const target = `/community/new${params.size ? `?${params}` : ""}`;
    return session?.user ? target : `/login?next=${encodeURIComponent(target)}`;
  }, [placeFilter, session?.user]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setQuery(search.trim());
  }

  return {
    posts,
    category,
    setCategory,
    search,
    setSearch,
    placeFilter,
    setPlaceFilter,
    page,
    hasMore,
    state,
    message,
    load,
    writeHref,
    submitSearch,
  };
}
