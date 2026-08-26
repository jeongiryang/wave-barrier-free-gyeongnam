"use client";

import { useState } from "react";
import { reportCommunityContent } from "../client/api";

export function useCommunityReport({ postId, authenticated, onLogin, setMessage }: {
  postId: string;
  authenticated: boolean;
  onLogin: () => void;
  setMessage: (message: string) => void;
}) {
  const [reportingTarget, setReportingTarget] = useState("");

  async function reportTarget(targetType: "post" | "comment", targetId: string, reason: string) {
    if (!authenticated) { onLogin(); return false; }
    const target = `${targetType}:${targetId}`;
    setReportingTarget(target);
    setMessage("");
    try {
      const { ok, status, payload } = await reportCommunityContent(postId, targetType, targetId, reason);
      if (status === 401) { onLogin(); return false; }
      if (!ok) { setMessage(payload.error || "신고를 전달하지 못했습니다."); return false; }
      setMessage(payload.underReview ? "운영팀 검토를 위해 잠시 숨김 처리했습니다." : "운영팀에 신고를 전달했습니다.");
      return true;
    } finally {
      setReportingTarget("");
    }
  }

  return { reportingTarget, reportTarget };
}
