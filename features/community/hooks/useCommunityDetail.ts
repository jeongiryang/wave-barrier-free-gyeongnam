"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../lib/auth/client";
import type { CommunityComment, CommunityPost } from "../../../lib/community/types";
import {
  createCommunityComment,
  getCommunityPost,
  removeCommunityComment,
  removeCommunityPost,
  setCommunityLike,
  updateCommunityComment,
} from "../client/api";

export function useCommunityDetail(postId: string) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [comment, setComment] = useState("");
  const [commentState, setCommentState] = useState<"idle" | "saving" | "error">("idle");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

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
  }, [load, session?.user]);

  const loginForCurrentPage = useCallback(() => {
    router.push(`/login?next=${encodeURIComponent(`/community/${postId}`)}`);
  }, [postId, router]);

  async function toggleLike() {
    if (!session?.user) { loginForCurrentPage(); return; }
    if (!post) return;
    const { ok, status, payload } = await setCommunityLike(postId, post.likedByMe);
    if (status === 401) { loginForCurrentPage(); return; }
    if (!ok) { setMessage(payload.error || "좋아요를 반영하지 못했습니다."); return; }
    setPost((current) => current ? {
      ...current,
      likedByMe: Boolean(payload.liked),
      likeCount: Number(payload.likeCount || 0),
    } : current);
  }

  async function deletePost() {
    if (!post || !window.confirm("이 게시글과 댓글을 모두 삭제할까요? 삭제 후 되돌릴 수 없습니다.")) return;
    const { ok, payload } = await removeCommunityPost(postId);
    if (!ok) { setMessage(payload.error || "게시글을 삭제하지 못했습니다."); return; }
    router.push("/community");
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!session?.user) { loginForCurrentPage(); return; }
    setCommentState("saving");
    setMessage("");
    const { ok, status, payload } = await createCommunityComment(postId, comment);
    if (status === 401) { loginForCurrentPage(); return; }
    if (!ok) { setMessage(payload.error || "댓글을 저장하지 못했습니다."); setCommentState("error"); return; }
    setComment("");
    setCommentState("idle");
    await load();
  }

  async function saveComment(commentId: string) {
    const { ok, payload } = await updateCommunityComment(postId, commentId, editingContent);
    if (!ok) { setMessage(payload.error || "댓글을 수정하지 못했습니다."); return; }
    setEditingComment(null);
    setEditingContent("");
    await load();
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    const { ok, payload } = await removeCommunityComment(postId, commentId);
    if (!ok) { setMessage(payload.error || "댓글을 삭제하지 못했습니다."); return; }
    await load();
  }

  return {
    post,
    comments,
    state,
    message,
    comment,
    setComment,
    commentState,
    editingComment,
    setEditingComment,
    editingContent,
    setEditingContent,
    session,
    sessionPending,
    load,
    toggleLike,
    deletePost,
    submitComment,
    saveComment,
    deleteComment,
  };
}
