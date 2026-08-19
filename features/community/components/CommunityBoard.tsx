"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import CommunityHeader from "../../../components/CommunityHeader";
import { authClient } from "../../../lib/auth/client";
import { COMMUNITY_CATEGORY_LABELS, communityDate, type CommunityPost } from "../../../lib/community/types";

type ListResponse = { posts?: CommunityPost[]; page?: number; hasMore?: boolean; error?: string };

type PlaceFilter = { id: string; name: string; region: string };

export default function CommunityPage({ initialPlace = null }: { initialPlace?: PlaceFilter | null }) {
  const { data: session } = authClient.useSession();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter | null>(initialPlace);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async (nextPage = 1) => {
    setState("loading");
    setMessage("");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12000);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: "12" });
      if (category) params.set("category", category);
      if (query) params.set("search", query);
      if (placeFilter?.id) params.set("placeId", placeFilter.id);
      const response = await fetch(`/api/community/posts?${params}`, { headers: { Accept: "application/json" }, signal: controller.signal });
      const payload = await response.json() as ListResponse;
      if (!response.ok) throw new Error(payload.error || "목록을 불러오지 못했습니다.");
      setPosts(payload.posts || []);
      setPage(nextPage);
      setHasMore(Boolean(payload.hasMore));
      setState("ready");
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError" ? "여행자 이야기를 불러오는 데 시간이 걸리고 있습니다. 다시 시도해 주세요." : error instanceof Error ? error.message : "목록을 불러오지 못했습니다.");
      setState("error");
    } finally {
      window.clearTimeout(timer);
    }
  }, [category, placeFilter, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const writeHref = useMemo(() => {
    const params = new URLSearchParams();
    if (placeFilter) { params.set("placeId", placeFilter.id); params.set("placeName", placeFilter.name); if (placeFilter.region) params.set("region", placeFilter.region); }
    const target = `/community/new${params.size ? `?${params}` : ""}`;
    return session?.user ? target : `/login?next=${encodeURIComponent(target)}`;
  }, [placeFilter, session?.user]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setQuery(search.trim());
  }

  return (
    <main className="community-page">
      <a className="skip-link" href="#community-list">게시글 목록으로 바로가기</a>
      <CommunityHeader />
      <section className="community-hero" aria-labelledby="community-title">
        <div><p className="section-kicker">TRAVELER COMMUNITY</p><h1 id="community-title">경남을 먼저 다녀온<br /><em>여행자의 이야기</em></h1><p>접근로의 실제 모습부터 아이와 머물기 좋은 시간까지, 관광지와 지역을 중심으로 질문하고 경험을 나눕니다.</p></div>
        <div className="community-principles" aria-label="커뮤니티 운영 원칙"><span><b>읽기는 모두에게</b><small>로그인 없이 공개 글을 확인합니다.</small></span><span><b>참여는 안전하게</b><small>글·댓글·좋아요는 계정으로 보호합니다.</small></span><span><b>관광지와 연결</b><small>여행 설계 화면의 장소에서 바로 이어집니다.</small></span></div>
      </section>

      <section className="community-workspace" id="community-list" aria-labelledby="community-list-title">
        <div className="community-toolbar">
          <div><p className="section-kicker">COMMUNITY BOARD</p><h2 id="community-list-title">여행자 이야기</h2></div>
          <a className="community-write" href={writeHref}>새 이야기 쓰기 <span aria-hidden="true">＋</span></a>
        </div>

        {placeFilter && <aside className="community-place-filter" aria-label="관광지 필터"><span><small>지금 보고 있는 관광지</small><strong>{placeFilter.region ? `${placeFilter.region} · ` : ""}{placeFilter.name}</strong></span><button type="button" onClick={() => setPlaceFilter(null)}>전체 이야기 보기</button></aside>}

        <div className="community-controls">
          <div className="community-tabs" role="group" aria-label="게시판 선택">{[["", "전체"], ...Object.entries(COMMUNITY_CATEGORY_LABELS)].map(([value, label]) => <button key={value || "all"} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</button>)}</div>
          <form role="search" onSubmit={submitSearch}><label className="sr-only" htmlFor="community-search">여행자 이야기 검색</label><input id="community-search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={80} placeholder="관광지, 지역, 제목 검색" /><button type="submit">검색</button></form>
        </div>

        <div aria-live="polite" aria-busy={state === "loading"}>
          {state === "loading" && <div className="community-skeletons" role="status"><span className="sr-only">게시글을 불러오는 중</span>{[1, 2, 3].map((item) => <i key={item} />)}</div>}
          {state === "error" && <div className="community-state" role="alert"><b>이야기를 불러오지 못했습니다.</b><p>{message}</p><button type="button" onClick={() => void load(page)}>다시 시도</button></div>}
          {state === "ready" && posts.length === 0 && <div className="community-state empty"><span aria-hidden="true">≈</span><b>{placeFilter ? "이 관광지의 첫 이야기를 기다리고 있어요." : "아직 등록된 이야기가 없습니다."}</b><p>실제 경험과 궁금한 점을 가장 먼저 남겨 주세요. 예시 게시글을 실제 글처럼 채워 두지 않습니다.</p><a href={writeHref}>첫 이야기 쓰기</a></div>}
          {state === "ready" && posts.length > 0 && <div className="community-list">{posts.map((post) => <article key={post.id}>
            <a href={`/community/${post.id}`} aria-label={`${post.title} 게시글 읽기`}><div className="community-card-meta"><span className={`category-${post.category}`}>{COMMUNITY_CATEGORY_LABELS[post.category]}</span><time dateTime={new Date(post.createdAt).toISOString()}>{communityDate(post.createdAt)}</time></div><h3>{post.title}</h3><p>{post.content}</p>{(post.region || post.placeName) && <div className="community-place-tag"><span aria-hidden="true">⌖</span>{post.region}{post.placeName ? `${post.region ? " · " : ""}${post.placeName}` : ""}</div>}<footer><span>{post.authorName}</span><span>좋아요 {post.likeCount} · 댓글 {post.commentCount}</span></footer></a>
          </article>)}</div>}
        </div>
        {state === "ready" && posts.length > 0 && <nav className="community-pagination" aria-label="게시글 페이지"><button type="button" disabled={page <= 1} onClick={() => void load(page - 1)}>이전</button><span>{page} 페이지</span><button type="button" disabled={!hasMore} onClick={() => void load(page + 1)}>다음</button></nav>}
      </section>
      <footer className="community-footer"><strong>W.A.V.E</strong><p>커뮤니티에는 W.A.V.E 사용자가 직접 작성한 경험이 표시됩니다. 공식 관광·접근성 정보는 여행 설계 화면에서 별도로 확인해 주세요.</p><a href="/planner">여행 설계로 돌아가기 →</a></footer>
    </main>
  );
}
