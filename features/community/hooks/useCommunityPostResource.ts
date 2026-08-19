"use client";

import { useCallback, useEffect, useState } from "react";
import type { CommunityComment, CommunityPost } from "../../../lib/community/types";
import { getCommunityPost } from "../client/api";

export function useCommunityPostResource(postId: string, sessionKey?: string) {
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const payload = await getCommunityPost(postId);
      setPost(payload.post);
      setComments(payload.comments || []);
      setState("ready");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "게시글을 불러오지 못했습니다.");
      setState("error");
    }
  }, [postId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, sessionKey]);

  return { post, setPost, comments, state, message, setMessage, load };
}
