"use client";

import type { Dispatch, SetStateAction } from "react";
import type { CommunityPost } from "../../../lib/community/types";
import { removeCommunityPost, setCommunityLike } from "../client/api";

export function useCommunityPostEngagement({ postId, post, setPost, setMessage, authenticated, onLogin, onDeleted }: {
  postId: string;
  post: CommunityPost | null;
  setPost: Dispatch<SetStateAction<CommunityPost | null>>;
  setMessage: (message: string) => void;
  authenticated: boolean;
  onLogin: () => void;
  onDeleted: () => void;
}) {
  async function toggleLike() {
    if (!authenticated) { onLogin(); return; }
    if (!post) return;
    const { ok, status, payload } = await setCommunityLike(postId, post.likedByMe);
    if (status === 401) { onLogin(); return; }
    if (!ok) { setMessage(payload.error || "좋아요를 반영하지 못했습니다."); return; }
    setPost((current) => current ? { ...current, likedByMe: Boolean(payload.liked), likeCount: Number(payload.likeCount || 0) } : current);
  }

  async function deletePost() {
    if (!post || !window.confirm("이 게시글과 댓글을 모두 삭제할까요? 삭제 후 되돌릴 수 없습니다.")) return;
    const { ok, payload } = await removeCommunityPost(postId);
    if (!ok) { setMessage(payload.error || "게시글을 삭제하지 못했습니다."); return; }
    onDeleted();
  }

  return { toggleLike, deletePost };
}
