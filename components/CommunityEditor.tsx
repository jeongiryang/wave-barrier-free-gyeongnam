"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth/client";
import { COMMUNITY_CATEGORY_LABELS, COMMUNITY_REGIONS, type CommunityPost } from "../lib/community/types";

type EditorValues = { category: keyof typeof COMMUNITY_CATEGORY_LABELS; title: string; content: string; region: string; placeId: string; placeName: string };

const emptyValues: EditorValues = { category: "place", title: "", content: "", region: "", placeId: "", placeName: "" };

export default function CommunityEditor({ postId }: { postId?: string }) {
  const router = useRouter();
  const editing = Boolean(postId);
  const { data: session, isPending } = authClient.useSession();
  const [values, setValues] = useState<EditorValues>(emptyValues);
  const [state, setState] = useState<"ready" | "loading" | "saving" | "error">(editing ? "loading" : "ready");
  const [message, setMessage] = useState("");
  const currentPath = useMemo(() => typeof window === "undefined" ? "/community/new" : `${window.location.pathname}${window.location.search}`, []);

  useEffect(() => {
    if (editing) return;
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get("placeId") || "";
    const placeName = params.get("placeName") || "";
    const region = COMMUNITY_REGIONS.includes((params.get("region") || "") as typeof COMMUNITY_REGIONS[number]) ? params.get("region") || "" : "";
    const timer = window.setTimeout(() => setValues((current) => ({ ...current, placeId, placeName, region })), 0);
    return () => window.clearTimeout(timer);
  }, [editing]);

  useEffect(() => {
    if (!editing || !postId) return;
    const controller = new AbortController();
    void fetch(`/api/community/posts/${postId}`, { headers: { Accept: "application/json" }, signal: controller.signal }).then(async (response) => {
      const payload = await response.json() as { post?: CommunityPost; error?: string };
      if (!response.ok || !payload.post) throw new Error(payload.error || "게시글을 불러오지 못했습니다.");
      if (!payload.post.isOwner) throw new Error("본인이 작성한 글만 수정할 수 있습니다.");
      setValues({ category: payload.post.category, title: payload.post.title, content: payload.post.content, region: payload.post.region || "", placeId: payload.post.placeId || "", placeName: payload.post.placeName || "" });
      setState("ready");
    }).catch((error) => { if (error instanceof DOMException && error.name === "AbortError") return; setMessage(error instanceof Error ? error.message : "게시글을 불러오지 못했습니다."); setState("error"); });
    return () => controller.abort();
  }, [editing, postId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("saving");
    setMessage("");
    try {
      const response = await fetch(editing ? `/api/community/posts/${postId}` : "/api/community/posts", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json() as { id?: string; error?: string; login?: string };
      if (response.status === 401) { router.push(`/login?next=${encodeURIComponent(currentPath)}`); return; }
      if (!response.ok) throw new Error(payload.error || "이야기를 저장하지 못했습니다.");
      router.push(`/community/${postId || payload.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이야기를 저장하지 못했습니다.");
      setState("error");
    }
  }

  if (!isPending && !session?.user) {
    return <div className="community-gate"><span aria-hidden="true">≈</span><h1>여행자 이야기를 남기려면 로그인해 주세요.</h1><p>글을 읽는 데는 계정이 필요하지 않습니다. 작성자 권한을 안전하게 확인하기 위해 쓰기 기능에만 W.A.V.E 계정을 사용합니다.</p><a href={`/login?next=${encodeURIComponent(currentPath)}`}>로그인하고 계속하기</a><a href="/community">커뮤니티 둘러보기</a></div>;
  }

  if (state === "loading" || isPending) return <div className="community-state" role="status" aria-live="polite"><b>글쓰기 화면을 준비하고 있습니다.</b></div>;
  if (state === "error" && editing && !values.title) return <div className="community-state" role="alert"><b>수정할 글을 열지 못했습니다.</b><p>{message}</p><a href="/community">커뮤니티로 돌아가기</a></div>;

  return (
    <form className="community-editor" onSubmit={submit} aria-busy={state === "saving"}>
      <div className="editor-heading"><p className="section-kicker">{editing ? "EDIT STORY" : "NEW STORY"}</p><h1>{editing ? "여행자 이야기 수정" : "경남 여행 이야기를 남겨 주세요"}</h1><p>직접 확인한 경험과 궁금한 점을 구분해 작성해 주세요. 공식 시설 정보는 여행 설계 화면의 출처와 기준 시각을 함께 확인할 수 있습니다.</p></div>
      {values.placeId && values.placeName && <aside className="editor-place"><span aria-hidden="true">⌖</span><div><small>연결된 관광지</small><strong>{values.region ? `${values.region} · ` : ""}{values.placeName}</strong></div><button type="button" onClick={() => setValues((current) => ({ ...current, placeId: "", placeName: "" }))}>연결 해제</button></aside>}
      <div className="editor-grid">
        <label>게시판<select value={values.category} onChange={(event) => setValues((current) => ({ ...current, category: event.target.value as EditorValues["category"] }))}>{Object.entries(COMMUNITY_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>지역<select value={values.region} onChange={(event) => setValues((current) => ({ ...current, region: event.target.value }))}>{COMMUNITY_REGIONS.map((region) => <option key={region || "none"} value={region}>{region || "지역 선택 안 함"}</option>)}</select></label>
      </div>
      <label>제목<input value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} required minLength={5} maxLength={120} aria-describedby="editor-title-help" /><small id="editor-title-help">5자 이상 120자 이하</small></label>
      <label>내용<textarea value={values.content} onChange={(event) => setValues((current) => ({ ...current, content: event.target.value }))} required minLength={10} maxLength={5000} rows={13} aria-describedby="editor-content-help" /><small id="editor-content-help">개인 연락처나 민감한 개인정보는 적지 마세요. 10자 이상 5,000자 이하</small></label>
      {message && <p className="editor-message" role="alert">{message}</p>}
      <div className="editor-actions"><a href={postId ? `/community/${postId}` : "/community"}>취소</a><button type="submit" disabled={state === "saving"}>{state === "saving" ? "저장하는 중…" : editing ? "수정 내용 저장" : "이야기 등록"}</button></div>
    </form>
  );
}
