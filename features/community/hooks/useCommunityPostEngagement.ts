"use client";

import { showActionToast } from "../../../lib/action-toast";
import { useLayoutEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CommunityPost } from "../../../lib/community/types";
import { communityErrorMessage, removeCommunityPost, setCommunityLike } from "../client/api";

export function useCommunityPostEngagement({ postId, post, setPost, setMessage, authenticated, userId, onLogin, onDeleted }: {
  postId: string;
  post: CommunityPost | null;
  setPost: Dispatch<SetStateAction<CommunityPost | null>>;
  setMessage: (message: string) => void;
  authenticated: boolean;
  userId: string;
  onLogin: () => void;
  onDeleted: () => void;
}) {
  const busy = useRef(false);
  const [likeState, setLikeState] = useState({ postId, userId, pending: false });
  if (likeState.postId !== postId || likeState.userId !== userId) {
    setLikeState({ postId, userId, pending: false });
  }
  const liking = likeState.postId === postId && likeState.userId === userId && likeState.pending;
  const generation = useRef(0);
  useLayoutEffect(() => {
    generation.current += 1;
    busy.current = false;
    // A response belongs to the account and article that started it. Invalidate
    // it even when the same account/article returns before that response arrives.
    return () => { generation.current += 1; busy.current = false; };
  }, [postId, userId]);
  async function toggleLike() {
    if (!authenticated) { onLogin(); return; }
    if (!post || busy.current) return;
    const requestGeneration = generation.current;
    busy.current = true; setLikeState({ postId, userId, pending: true }); setMessage("");
    try {
      const { ok, status, payload } = await setCommunityLike(postId, post.likedByMe);
      if (generation.current !== requestGeneration) return;
      if (status === 401) { onLogin(); return; }
      if (!ok) { const message = payload.error || "좋아요를 반영하지 못했습니다."; setMessage(message); showActionToast(message); return; }
      setPost((current) => current?.id === postId ? { ...current, likedByMe: Boolean(payload.liked), likeCount: Number(payload.likeCount || 0) } : current);
      showActionToast(payload.liked ? "좋아요를 눌렀습니다." : "좋아요를 취소했습니다.");
    } catch (error) {
      if (generation.current !== requestGeneration) return;
      const message = communityErrorMessage(error, "좋아요를 반영하지 못했습니다."); setMessage(message); showActionToast(message);
    } finally { if (generation.current === requestGeneration) { busy.current = false; setLikeState({ postId, userId, pending: false }); } }
  }

  async function deletePost() {
    if (!post || !window.confirm("이 게시글과 댓글을 모두 삭제할까요? 삭제 후 되돌릴 수 없습니다.")) return;
    const requestGeneration = generation.current;
    try {
      const { ok, payload } = await removeCommunityPost(postId);
      if (generation.current !== requestGeneration) return;
      if (!ok) { setMessage(payload.error || "게시글을 삭제하지 못했습니다."); return; }
      onDeleted();
    } catch (error) {
      if (generation.current !== requestGeneration) return;
      setMessage(communityErrorMessage(error, "게시글을 삭제하지 못했습니다."));
    }
  }

  return { toggleLike, liking, deletePost };
}
