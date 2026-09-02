"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { applyCommunityModeration, communityErrorMessage, getCommunityModerationQueue, isCommunityRequestError, type CommunityModerationReport } from "../client/api";

const reasonLabels: Record<string, string> = {
  incorrect: "사실과 다른 정보", unsafe: "여행 안전 우려", spam: "광고·도배",
  abuse: "비방·혐오 표현", privacy: "개인정보 노출", other: "기타 운영 위반",
};

export default function CommunityModerationQueue() {
  const [reports, setReports] = useState<CommunityModerationReport[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async (signal?: AbortSignal, announce = false) => {
    if (announce) setState("loading");
    const result = await getCommunityModerationQueue(signal).catch((error) => {
      if (isCommunityRequestError(error) && error.kind === "aborted") return null;
      setMessage(communityErrorMessage(error, "운영 목록을 불러오지 못했습니다."));
      return null;
    });
    if (signal?.aborted) return;
    if (!result || !result.ok) {
      if (result) setMessage(result.payload.error || "운영 목록을 불러오지 못했습니다.");
      setState("error");
      return;
    }
    setReports(result.payload.reports || []);
    setMessage("");
    setState("ready");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const frame = window.requestAnimationFrame(() => void load(controller.signal));
    return () => { window.cancelAnimationFrame(frame); controller.abort(); };
  }, [load]);

  async function decide(report: CommunityModerationReport, status: "active" | "hidden") {
    try {
      const result = await applyCommunityModeration(report.targetType, report.targetId, status);
      if (!result.ok) { setMessage(result.payload.error || "운영 처리를 반영하지 못했습니다."); return; }
      setReports((current) => current.filter((item) => !(item.targetType === report.targetType && item.targetId === report.targetId)));
      setMessage(status === "hidden" ? "해당 내용을 숨겼습니다." : "신고를 기각하고 내용을 유지했습니다.");
    } catch (error) {
      setMessage(communityErrorMessage(error, "운영 처리를 반영하지 못했습니다."));
    }
  }

  return <section className="moderation-queue" aria-labelledby="moderation-title">
    <header><p className="section-kicker">COMMUNITY CARE</p><h1 id="moderation-title">커뮤니티 운영 목록</h1><p>신고된 여행 경험을 확인하고 공개 유지 또는 숨김을 결정합니다. 운영자 ID는 서버 환경 변수로만 관리됩니다.</p></header>
    {state === "loading" && <div className="community-detail-state" role="status">운영 목록을 불러오는 중</div>}
    {state === "error" && <div className="community-detail-state" role="alert"><b>운영 목록을 열지 못했습니다.</b><p>{message}</p><button type="button" onClick={() => void load(undefined, true)}>다시 시도</button><Link href="/community">커뮤니티로 돌아가기</Link></div>}
    {state === "ready" && !reports.length && <div className="community-detail-state" role="status"><b>처리할 신고가 없습니다.</b><Link href="/community">커뮤니티로 돌아가기</Link></div>}
    {state === "ready" && reports.length > 0 && <ol>{reports.map((report) => <li key={report.id}>
      <div><span>{reasonLabels[report.reason] || report.reason}</span><small>{report.targetType === "post" ? "게시글" : "댓글"} · {new Date(report.createdAt).toLocaleString("ko-KR")}</small></div>
      <h2>{report.postTitle}</h2><p>{report.targetContent}</p>{report.details && <blockquote>{report.details}</blockquote>}
      <footer><Link href={`/community/${report.postId}`}>원문 확인</Link><button type="button" onClick={() => void decide(report, "active")}>공개 유지</button><button type="button" className="danger" onClick={() => void decide(report, "hidden")}>숨김 처리</button></footer>
    </li>)}</ol>}
    {message && state === "ready" && <p className="detail-message" role="status">{message}</p>}
  </section>;
}
