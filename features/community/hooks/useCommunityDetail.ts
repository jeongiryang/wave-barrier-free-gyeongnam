"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../lib/auth/client";
import { useCommunityCommentActions } from "./useCommunityCommentActions";
import { useCommunityPostEngagement } from "./useCommunityPostEngagement";
import { useCommunityPostResource } from "./useCommunityPostResource";

export function useCommunityDetail(postId: string) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const resource = useCommunityPostResource(postId, session?.user?.id);
  const loginForCurrentPage = useCallback(() => {
    router.push(`/login?next=${encodeURIComponent(`/community/${postId}`)}`);
  }, [postId, router]);
  const engagement = useCommunityPostEngagement({
    postId,
    post: resource.post,
    setPost: resource.setPost,
    setMessage: resource.setMessage,
    authenticated: Boolean(session?.user),
    onLogin: loginForCurrentPage,
    onDeleted: () => router.push("/community"),
  });
  const comments = useCommunityCommentActions({
    postId,
    authenticated: Boolean(session?.user),
    onLogin: loginForCurrentPage,
    reload: resource.load,
    setMessage: resource.setMessage,
  });

  return { ...resource, ...comments, ...engagement, session, sessionPending };
}
