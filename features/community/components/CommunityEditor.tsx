"use client";

import Link from "next/link";
import { COMMUNITY_CATEGORY_LABELS, COMMUNITY_REGIONS } from "../../../lib/community/types";
import { useCommunityEditor } from "../hooks/useCommunityEditor";

export default function CommunityEditor({ postId }: { postId?: string }) {
  const {
    editing, session, isPending, values, setValues, state, message, currentPath, submit,
  } = useCommunityEditor(postId);

  if (!isPending && !session?.user) {
    return <div className="community-gate"><span aria-hidden="true">≈</span><h1>여행자 이야기를 남기려면 로그인해 주세요.</h1><p>글을 읽는 데는 계정이 필요하지 않습니다. 작성자 권한을 안전하게 확인하기 위해 쓰기 기능에만 W.A.V.E 계정을 사용합니다.</p><Link href={`/login?next=${encodeURIComponent(currentPath)}`}>로그인하고 계속하기</Link><Link href="/community">커뮤니티 둘러보기</Link></div>;
  }

  if (state === "loading" || isPending) return <div className="community-state" role="status" aria-live="polite"><b>글쓰기 화면을 준비하고 있습니다.</b></div>;
  if (state === "error" && editing && !values.title) return <div className="community-state" role="alert"><b>수정할 글을 열지 못했습니다.</b><p>{message}</p><Link href="/community">커뮤니티로 돌아가기</Link></div>;

  return (
    <form className="community-editor" onSubmit={submit} aria-busy={state === "saving"}>
      <div className="editor-heading"><p className="section-kicker">{editing ? "EDIT STORY" : "NEW STORY"}</p><h1>{editing ? "여행자 이야기 수정" : "경남 여행 이야기를 남겨 주세요"}</h1><p>직접 확인한 경험과 궁금한 점을 구분해 작성해 주세요. 공식 시설 정보는 여행 설계 화면의 출처와 기준 시각을 함께 확인할 수 있습니다.</p></div>
      {values.placeId && values.placeName && <aside className="editor-place"><span aria-hidden="true">⌖</span><div><small>연결된 관광지</small><strong>{values.region ? `${values.region} · ` : ""}{values.placeName}</strong></div><button type="button" onClick={() => setValues((current) => ({ ...current, placeId: "", placeName: "" }))}>연결 해제</button></aside>}
      <div className="editor-grid">
        <label>게시판<select value={values.category} onChange={(event) => setValues((current) => ({ ...current, category: event.target.value as keyof typeof COMMUNITY_CATEGORY_LABELS }))}>{Object.entries(COMMUNITY_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>지역<select value={values.region} onChange={(event) => setValues((current) => ({ ...current, region: event.target.value }))}>{COMMUNITY_REGIONS.map((region) => <option key={region || "none"} value={region}>{region || "지역 선택 안 함"}</option>)}</select></label>
      </div>
      <label>제목<input value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} required minLength={5} maxLength={120} aria-describedby="editor-title-help" /><small id="editor-title-help">5자 이상 120자 이하</small></label>
      <label>내용<textarea value={values.content} onChange={(event) => setValues((current) => ({ ...current, content: event.target.value }))} required minLength={10} maxLength={5000} rows={13} aria-describedby="editor-content-help" /><small id="editor-content-help">개인 연락처나 민감한 개인정보는 적지 마세요. 10자 이상 5,000자 이하</small></label>
      {message && <p className="editor-message" role="alert">{message}</p>}
      <div className="editor-actions"><Link href={postId ? `/community/${postId}` : "/community"}>취소</Link><button type="submit" disabled={state === "saving"}>{state === "saving" ? "저장하는 중…" : editing ? "수정 내용 저장" : "이야기 등록"}</button></div>
    </form>
  );
}
