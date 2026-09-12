"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { facilityHistory, fieldReportDraftHref } from "../../../lib/community/facility-history.js";
import { ACCESSIBILITY_REPORT_STATUSES } from "../../../lib/community/field-report.js";
import type { CommunityPost } from "../../../lib/community/types";
import { communityErrorMessage, listCommunityPosts } from "../../community/client/api";
import type { Place } from "../types";

const actionStyle = { minHeight: 44, padding: "8px 16px", border: "1px solid var(--line)", borderRadius: 24, background: "var(--white)", color: "var(--blue)", fontSize: 14 };
const statusLabels = new Map(ACCESSIBILITY_REPORT_STATUSES.map(item => [item.id, item.label]));

export default function PlaceFacilityHistory({ place, region }: { place: Place; region: string }) {
  const id = useId(), controller = useRef<AbortController | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(0), [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false), [message, setMessage] = useState("");
  useEffect(() => () => controller.current?.abort(), []);

  async function load(nextPage: number) {
    if (loading || nextPage > 10) return;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setLoading(true); setMessage("");
    try {
      const result = await listCommunityPosts(new URLSearchParams({ placeId: place.id, history: "1", page: String(nextPage), limit: "20" }), request.signal);
      if (!Array.isArray(result.posts)) throw new Error("제보 목록을 확인하지 못했어요.");
      if (request.signal.aborted) return;
      const next = result.posts.filter(post => post.category === "review" && post.placeId === place.id);
      setPosts(current => [...new Map((nextPage === 1 ? next : [...current, ...next]).map(post => [post.id, post])).values()].slice(0, 200));
      setPage(nextPage); setHasMore(Boolean(result.hasMore));
    } catch (error) {
      if (!request.signal.aborted) setMessage(communityErrorMessage(error, "시설 제보를 불러오지 못했어요. 다시 시도해 주세요."));
    } finally { if (!request.signal.aborted) setLoading(false); }
  }

  const history = facilityHistory(posts, place.id);
  return <section className="place-community-stories" aria-labelledby={id}>
    <header><div><small>여행자가 직접 확인한 기록</small><h3 id={id}>편의시설, 언제 확인했을까요?</h3></div></header>
    <p>공식 편의정보 아래에서 여행자의 실제 방문일과 경험을 비교하세요. 방문이나 시설 상태를 WAVE가 인증한 기록은 아니며 공식 점수에는 반영하지 않습니다.</p>
    <button type="button" style={actionStyle} aria-busy={loading} disabled={loading} onClick={() => void load(1)}>{loading ? "시설 제보 확인 중…" : page ? "최근 제보 다시 확인" : "시설 제보 이력 확인"}</button>
    <div role="status">{message || (page ? `방문일 순으로 후기 ${posts.length}건을 불러왔어요.${hasMore ? " 더 이전 기록이 있습니다." : ""}` : "")}</div>
    {!!page && <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
      {history.map(item => <article key={item.field} style={{ padding: 20, border: "1px solid var(--line)", borderRadius: 18, background: "var(--white)" }}>
        <h4 style={{ fontSize: 18, margin: "0 0 12px" }}>{item.label}</h4>
        {item.latest ? <>
          <p><strong>{statusLabels.get(item.latest.status)}</strong> · 방문 {item.latest.visitDate} · {item.ageDays}일 전</p>
          {item.latest.note && <p>{item.latest.note}</p>}
          {item.conflict && <p><strong>같은 방문일의 제보가 서로 달라요.</strong> 원문과 운영기관 안내를 함께 확인해 주세요.</p>}
          <Link href={`/community/${encodeURIComponent(item.latest.postId)}`} style={{ display: "inline-flex", alignItems: "center", minHeight: 44 }}>최근 제보 원문 · {item.latest.authorName}</Link>
          {item.observations.length > 1 && <details style={{ marginTop: 12 }}><summary style={{ minHeight: 44, cursor: "pointer" }}>불러온 항목별 기록 {item.observations.length}건</summary><ul style={{ paddingInlineStart: 20 }}>{item.observations.map(report => <li key={report.postId} style={{ display: "block", fontSize: 14 }}><Link href={`/community/${encodeURIComponent(report.postId)}`} style={{ display: "block", paddingBlock: 12 }}>{report.visitDate} · {statusLabels.get(report.status)} · {report.authorName}</Link>{report.note && <p style={{ margin: "0 0 12px" }}>{report.note}</p>}</li>)}</ul></details>}
        </> : <p>불러온 후기 중 방문일이 있는 확인 기록이 없어요.</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
          {(["confirmed", "changed"] as const).map(status => <Link key={status} href={fieldReportDraftHref({ placeId: place.id, placeName: place.name, region, field: item.field, status })} style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "8px 14px", border: "1px solid var(--line)", borderRadius: 24 }}>{status === "confirmed" ? "직접 확인했어요" : "달라진 점이 있어요"}</Link>)}
        </div>
      </article>)}
      {hasMore && (page < 10 ? <button type="button" style={actionStyle} aria-busy={loading} disabled={loading} onClick={() => void load(page + 1)}>이전 방문 기록 더 보기</button> : <p>최근 후기 200건을 표시하고 있어요. 더 이전 내용은 <Link href={`/community?placeId=${encodeURIComponent(place.id)}`}>장소 전체 후기</Link>에서 확인하세요.</p>)}
    </div>}
  </section>;
}
