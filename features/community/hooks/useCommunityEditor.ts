"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../lib/auth/client";
import { COMMUNITY_REGIONS } from "../../../lib/community/types";
import {
  getCommunityPost,
  saveCommunityPost,
  type CommunityPostInput,
} from "../client/api";

const emptyValues: CommunityPostInput = {
  category: "place",
  title: "",
  content: "",
  region: "",
  placeId: "",
  placeName: "",
};

export function useCommunityEditor(postId?: string) {
  const router = useRouter();
  const editing = Boolean(postId);
  const { data: session, isPending } = authClient.useSession();
  const [values, setValues] = useState<CommunityPostInput>(emptyValues);
  const [state, setState] = useState<"ready" | "loading" | "saving" | "error">(editing ? "loading" : "ready");
  const [message, setMessage] = useState("");
  const currentPath = useMemo(() => typeof window === "undefined"
    ? "/community/new"
    : `${window.location.pathname}${window.location.search}`, []);

  useEffect(() => {
    if (editing) return;
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get("placeId") || "";
    const placeName = params.get("placeName") || "";
    const requestedRegion = params.get("region") || "";
    const region = COMMUNITY_REGIONS.includes(requestedRegion as typeof COMMUNITY_REGIONS[number])
      ? requestedRegion
      : "";
    const timer = window.setTimeout(() => setValues((current) => ({
      ...current,
      placeId,
      placeName,
      region,
    })), 0);
    return () => window.clearTimeout(timer);
  }, [editing]);

  useEffect(() => {
    if (!editing || !postId) return;
    const controller = new AbortController();
    void getCommunityPost(postId, controller.signal).then((payload) => {
      if (!payload.post.isOwner) throw new Error("본인이 작성한 글만 수정할 수 있습니다.");
      setValues({
        category: payload.post.category,
        title: payload.post.title,
        content: payload.post.content,
        region: payload.post.region || "",
        placeId: payload.post.placeId || "",
        placeName: payload.post.placeName || "",
      });
      setState("ready");
    }).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage(error instanceof Error ? error.message : "게시글을 불러오지 못했습니다.");
      setState("error");
    });
    return () => controller.abort();
  }, [editing, postId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setMessage("");
    try {
      const { ok, status, payload } = await saveCommunityPost(postId, values);
      if (status === 401) {
        router.push(`/login?next=${encodeURIComponent(currentPath)}`);
        return;
      }
      if (!ok) throw new Error(payload.error || "이야기를 저장하지 못했습니다.");
      router.push(`/community/${postId || payload.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이야기를 저장하지 못했습니다.");
      setState("error");
    }
  }

  return {
    editing,
    session,
    isPending,
    values,
    setValues,
    state,
    message,
    currentPath,
    submit,
  };
}
