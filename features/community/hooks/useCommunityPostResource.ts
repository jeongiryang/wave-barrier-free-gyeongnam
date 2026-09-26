"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { CommunityComment, CommunityPost } from "../../../lib/community/types";
import { communityErrorMessage, isCommunityRequestError, getCommunityPost } from "../client/api";

export function useCommunityPostResource(postId: string, sessionKey?: string) {
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const postMutationVersion = useRef(0);
  const updatePost = useCallback<Dispatch<SetStateAction<CommunityPost | null>>>((value) => {
    postMutationVersion.current += 1;
    setPost(value);
  }, []);

  const load = useCallback(async (preserveContent = false) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    const mutationVersion = postMutationVersion.current;
    requestRef.current = controller;
    if (!preserveContent) setState("loading");
    setMessage("");
    try {
      const payload = await getCommunityPost(postId, controller.signal);
      if (requestRef.current !== controller) return;
      // A comment refresh may finish after a confirmed like mutation.
      if (!preserveContent || postMutationVersion.current === mutationVersion) setPost(payload.post);
      setComments(payload.comments || []);
      setState("ready");
    } catch (error) {
      if (requestRef.current !== controller) return;
      if (isCommunityRequestError(error) && error.kind === "aborted") return;
      setMessage(preserveContent
        ? "변경 내용은 저장됐지만 최신 댓글을 불러오지 못했습니다. 새로고침해 확인해 주세요."
        : communityErrorMessage(error, "게시글을 불러오지 못했습니다."));
      if (!preserveContent) setState("error");
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

  return { post, setPost: updatePost, comments, state, message, setMessage, load };
}
