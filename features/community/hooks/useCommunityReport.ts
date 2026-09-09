"use client";

import { useState } from "react";
import { communityErrorMessage, reportCommunityContent } from "../client/api";

export function useCommunityReport({ postId, authenticated, onLogin }: {
  postId: string;
  authenticated: boolean;
  onLogin: () => void;
}) {
  const [reportingTarget, setReportingTarget] = useState("");

  async function reportTarget(targetType: "post" | "comment", targetId: string, reason: string) {
    if (!authenticated) { onLogin(); return { ok: false }; }
    const target = `${targetType}:${targetId}`;
    setReportingTarget(target);
    try {
      const { ok, status, payload } = await reportCommunityContent(postId, targetType, targetId, reason);
      if (status === 401) { onLogin(); return { ok: false }; }
      if (!ok) return { ok: false, message: payload.error || "신고를 전달하지 못했습니다." };
      return { ok: true, message: payload.underReview ? "운영팀 검토를 위해 잠시 숨김 처리했습니다." : "운영팀에 신고를 전달했습니다." };
    } catch (error) {
      return { ok: false, message: communityErrorMessage(error, "신고를 전달하지 못했습니다.") };
    } finally {
      setReportingTarget("");
    }
  }

  return { reportingTarget, reportTarget };
}
