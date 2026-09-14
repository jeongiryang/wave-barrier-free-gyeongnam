"use client";

import { useEffect, useState, type FormEvent } from "react";
import { communityErrorMessage, createCommunityComment, removeCommunityComment, updateCommunityComment } from "../client/api";
import { communityCommentDraftKey, sanitizeCommunityCommentDraft } from '../../../lib/community-comment-draft.js';

export function useCommunityCommentActions({ postId, authenticated, userId, onLogin, reload, setMessage }: {
  postId: string;
  authenticated: boolean;
  userId: string;
  onLogin: () => void;
  reload: () => Promise<void>;
  setMessage: (message: string) => void;
}) {
  const [comment, setComment] = useState("");
  const [commentState, setCommentState] = useState<"idle" | "saving" | "error">("idle");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const key = communityCommentDraftKey(postId, userId);
  const [hydratedKey, setHydratedKey] = useState('');
  const preserveForLogin = () => { try { sessionStorage.setItem(communityCommentDraftKey(postId), sanitizeCommunityCommentDraft(comment)); } catch { /* no-op */ } };
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const anonymousKey = communityCommentDraftKey(postId);
        const saved = sessionStorage.getItem(key) ?? (userId ? sessionStorage.getItem(anonymousKey) : null) ?? '';
        setComment(sanitizeCommunityCommentDraft(saved));
        if (userId && saved) { sessionStorage.setItem(key, saved); sessionStorage.removeItem(anonymousKey); }
      } catch { /* A blocked session store must not block commenting. */ }
      setHydratedKey(key);
    });
    return () => cancelAnimationFrame(frame);
  }, [key, postId, userId]);
  useEffect(() => {
    if (hydratedKey !== key) return;
    try { if (comment) sessionStorage.setItem(key, sanitizeCommunityCommentDraft(comment)); else sessionStorage.removeItem(key); } catch { /* Keep draft in React state. */ }
  }, [comment, hydratedKey, key]);
  function discardCommentDraft() {
    setComment('');
    try { sessionStorage.removeItem(key); sessionStorage.removeItem(communityCommentDraftKey(postId)); } catch { /* no-op */ }
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!authenticated) { preserveForLogin(); onLogin(); return; }
    setCommentState("saving");
    setMessage("");
    try {
      const { ok, status, payload } = await createCommunityComment(postId, comment);
      if (status === 401) { preserveForLogin(); onLogin(); return; }
      if (!ok) { setMessage(payload.error || "댓글을 저장하지 못했습니다."); setCommentState("error"); return; }
      discardCommentDraft();
      await reload();
    } catch (error) {
      setMessage(communityErrorMessage(error, "댓글을 저장하지 못했습니다."));
      setCommentState("error");
    } finally {
      setCommentState((current) => current === "saving" ? "idle" : current);
    }
  }

  async function saveComment(commentId: string) {
    try {
      const { ok, payload } = await updateCommunityComment(postId, commentId, editingContent);
      if (!ok) { setMessage(payload.error || "댓글을 수정하지 못했습니다."); return; }
      setEditingComment(null);
      setEditingContent("");
      await reload();
    } catch (error) {
      setMessage(communityErrorMessage(error, "댓글을 수정하지 못했습니다."));
    }
  }

  async function deleteComment(commentId: string) {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    try {
      const { ok, payload } = await removeCommunityComment(postId, commentId);
      if (!ok) { setMessage(payload.error || "댓글을 삭제하지 못했습니다."); return; }
      await reload();
    } catch (error) {
      setMessage(communityErrorMessage(error, "댓글을 삭제하지 못했습니다."));
    }
  }

  return { comment, setComment, discardCommentDraft, commentState, editingComment, setEditingComment, editingContent, setEditingContent, submitComment, saveComment, deleteComment };
}
