"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CommunityComment, CommunityPost } from "../../../lib/community/types";
import { communityErrorMessage, isCommunityRequestError, getCommunityPost } from "../client/api";

export function useCommunityPostResource(postId: string, sessionKey?: string) {
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const requestRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState("loading");
    setMessage("");
    try {
      const payload = await getCommunityPost(postId, controller.signal);
      if (requestRef.current !== controller) return;
      setPost(payload.post);
      setComments(payload.comments || []);
      setState("ready");
    } catch (error) {
      if (requestRef.current !== controller) return;
      if (isCommunityRequestError(error) && error.kind === "aborted") return;
      setMessage(communityErrorMessage(error, "게시글을 불러오지 못했습니다."));
      setState("error");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }, [postId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      requestRef.current?.abort();
    };
  }, [load, sessionKey]);

  return { post, setPost, comments, state, message, setMessage, load };
}
