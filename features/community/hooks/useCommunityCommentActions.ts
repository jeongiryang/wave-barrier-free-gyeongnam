"use client";

import { useState, type FormEvent } from "react";
import { createCommunityComment, removeCommunityComment, updateCommunityComment } from "../client/api";

export function useCommunityCommentActions({ postId, authenticated, onLogin, reload, setMessage }: {
  postId: string;
  authenticated: boolean;
  onLogin: () => void;
  reload: () => Promise<void>;
  setMessage: (message: string) => void;
}) {
  const [comment, setComment] = useState("");
  const [commentState, setCommentState] = useState<"idle" | "saving" | "error">("idle");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!authenticated) { onLogin(); return; }
    setCommentState("saving");
    setMessage("");
    const { ok, status, payload } = await createCommunityComment(postId, comment);
    if (status === 401) { onLogin(); return; }
    if (!ok) { setMessage(payload.error || "댓글을 저장하지 못했습니다."); setCommentState("error"); return; }
    setComment("");
    setCommentState("idle");
    await reload();
  }

  async function saveComment(commentId: string) {
    const { ok, payload } = await updateCommunityComment(postId, commentId, editingContent);
    if (!ok) { setMessage(payload.error || "댓글을 수정하지 못했습니다."); return; }
    setEditingComment(null);
    setEditingContent("");
    await reload();
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    const { ok, payload } = await removeCommunityComment(postId, commentId);
    if (!ok) { setMessage(payload.error || "댓글을 삭제하지 못했습니다."); return; }
    await reload();
  }

  return { comment, setComment, commentState, editingComment, setEditingComment, editingContent, setEditingContent, submitComment, saveComment, deleteComment };
}
