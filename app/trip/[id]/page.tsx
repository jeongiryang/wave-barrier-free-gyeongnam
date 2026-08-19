"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import GithubFooterLink from "../../../components/GithubFooterLink";

type SharedPlace = { id: string; name: string; city: string; summary: string; image: string; score: number | null; features: string[] };
type SharedTrip = {
  plan: { generatedAt: string; places: SharedPlace[]; stops: Array<{ title: string; note: string; source: string }>; crowd?: { rate: number; place: string } | null };
  selections: { region?: string; theme?: string; profiles?: string[] };
  origin?: { label?: string };
  expiresAt: number;
};

export default function SharedTripPage() {
  const params = useParams<{ id: string }>();
  const [trip, setTrip] = useState<SharedTrip | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!params.id) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort("timeout"), 35000);
    void Promise.resolve()
      .then(() => {
        if (!controller.signal.aborted) {
          setTrip(null);
          setError("");
        }
        return fetch(`/api/trips/${encodeURIComponent(params.id)}`, { headers: { Accept: "application/json" }, signal: controller.signal });
      })
      .then(async (response) => {
        const data = await response.json().catch(() => null) as (SharedTrip & { error?: string }) | null;
        if (!response.ok || !data) throw new Error(data?.error || "공유 여행 서버가 올바른 응답을 보내지 않았습니다.");
        setTrip(data);
      })
      .catch((reason: Error) => {
        if (controller.signal.reason === "unmount") return;
        setError(controller.signal.aborted
          ? "공식 관광정보 확인이 평소보다 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요."
          : reason.message);
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      window.clearTimeout(timeout);
      controller.abort("unmount");
    };
  }, [params.id, retry]);

  return (
    <main className="shared-trip-page">
      <header className="shared-header"><a className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></a><a href="/planner">내 여행 새로 만들기 ↗</a></header>
      {!trip && !error && <section className="shared-loading" role="status" aria-live="polite"><span aria-hidden="true" /><p><b>공유된 여행 계획을 불러오고 있습니다.</b><small>저장 당시 조건으로 최신 공식 관광정보를 다시 확인합니다.</small></p></section>}
      {error && <section className="shared-error" role="alert"><p className="section-kicker">SHARED TRIP</p><h1>이 여행 계획을 열 수 없습니다.</h1><p>{error}</p><div className="shared-error-actions"><button type="button" onClick={() => setRetry((current) => current + 1)}>다시 시도</button><a href="/planner">새 여행 만들기 →</a></div></section>}
      {trip && <>
        <section className="shared-hero"><div><p className="section-kicker">SHARED W.A.V.E ROUTE</p><h1>{trip.selections.region || "경남"}에서 만나는<br />장벽 없는 하루</h1><p>{trip.origin?.label || "선택 출발지"}에서 시작하는 맞춤 여행 계획입니다.</p><div><span>여행지 <b>{trip.plan.places.length}곳</b></span><span>공유 보관 <b>{new Date(trip.expiresAt).toLocaleDateString("ko-KR")}까지</b></span>{trip.plan.crowd && <span>집중률 <b>{trip.plan.crowd.rate.toFixed(1)}%</b></span>}</div></div></section>
        <section className="shared-content"><div className="shared-places">{trip.plan.places.map((place, index) => <article key={place.id}><div style={place.image ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(4,25,44,.7)), url("${place.image}")` } : undefined}><span>{String(index + 1).padStart(2, "0")}</span><b>{place.city}</b></div><section><h2>{place.name}</h2><p>{place.summary}</p><div>{place.features.slice(0, 3).map((feature) => <span key={feature}>✓ {feature}</span>)}</div><strong className={place.score === null ? "pending" : ""}>{place.score === null ? "판단 보류" : `${place.score}%`}<small>{place.score === null ? "공식 편의근거 부족" : "선택 편의조건 일치"}</small></strong></section></article>)}</div><aside><p className="section-kicker">ITINERARY</p><h2>여행 순서</h2><ol>{trip.plan.stops.map((stop, index) => <li key={`${stop.title}-${index}`}><span>{index + 1}</span><div><small>{stop.source}</small><h3>{stop.title}</h3><p>{stop.note}</p></div></li>)}</ol><a href={`/planner?region=${encodeURIComponent(trip.selections.region || "창원")}`}>이 조건으로 다시 설계하기 →</a></aside></section>
      </>}
      <footer className="simple-footer shared-footer"><div className="brand footer-brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></div><div className="footer-notes"><p>누구나 원하는 곳으로, 경남 무장애 여행 길잡이</p><p className="trust-notice">공유 여행은 저장한 조건으로 최신 공식 관광정보를 다시 확인합니다.</p></div><div className="footer-meta"><GithubFooterLink /></div></footer>
    </main>
  );
}
