"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../lib/auth/client";
import type { CommunityComment, CommunityPost } from "../../../lib/community/types";

type DetailResponse = { post?: CommunityPost; comments?: CommunityComment[]; error?: string };

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
      const response = await fetch(`/api/community/posts/${postId}`, { headers: { Accept: "application/json" } });
      const payload = await response.json() as DetailResponse;
      if (!response.ok || !payload.post) throw new Error(payload.error || "게시글을 불러오지 못했습니다.");
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
    const response = await fetch(`/api/community/posts/${postId}/like`, {
      method: post.likedByMe ? "DELETE" : "POST",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json() as { liked?: boolean; likeCount?: number; error?: string };
    if (response.status === 401) { loginForCurrentPage(); return; }
    if (!response.ok) { setMessage(payload.error || "좋아요를 반영하지 못했습니다."); return; }
    setPost((current) => current ? {
      ...current,
      likedByMe: Boolean(payload.liked),
      likeCount: Number(payload.likeCount || 0),
    } : current);
  }

  async function deletePost() {
    if (!post || !window.confirm("이 게시글과 댓글을 모두 삭제할까요? 삭제 후 되돌릴 수 없습니다.")) return;
    const response = await fetch(`/api/community/posts/${postId}`, { method: "DELETE", headers: { Accept: "application/json" } });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setMessage(payload.error || "게시글을 삭제하지 못했습니다."); return; }
    router.push("/community");
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!session?.user) { loginForCurrentPage(); return; }
    setCommentState("saving");
    setMessage("");
    const response = await fetch(`/api/community/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ content: comment }),
    });
    const payload = await response.json() as { error?: string };
    if (response.status === 401) { loginForCurrentPage(); return; }
    if (!response.ok) { setMessage(payload.error || "댓글을 저장하지 못했습니다."); setCommentState("error"); return; }
    setComment("");
    setCommentState("idle");
    await load();
  }

  async function saveComment(commentId: string) {
    const response = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ content: editingContent }),
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setMessage(payload.error || "댓글을 수정하지 못했습니다."); return; }
    setEditingComment(null);
    setEditingContent("");
    await load();
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    const response = await fetch(`/api/community/posts/${postId}/comments/${commentId}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) { setMessage(payload.error || "댓글을 삭제하지 못했습니다."); return; }
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
