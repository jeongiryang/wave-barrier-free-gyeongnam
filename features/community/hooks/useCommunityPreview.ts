"use client";

import { useEffect, useState } from "react";
import type { CommunityPost } from "../../../lib/community/types";
import { listCommunityPosts } from "../client/api";

export function useCommunityPreview() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    const params = new URLSearchParams({ limit: "2" });
    void listCommunityPosts(params, controller.signal)
      .then((payload) => { if (active) setPosts(payload.posts || []); })
      .catch(() => undefined)
      .finally(() => {
        window.clearTimeout(timer);
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  return { posts, loaded };
}
