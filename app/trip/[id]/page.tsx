"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type SharedPlace = { id: string; name: string; city: string; summary: string; image: string; score: number; features: string[] };
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

  useEffect(() => {
    if (!params.id) return;
    void fetch(`/api/trips/${encodeURIComponent(params.id)}`, { headers: { Accept: "application/json" } })
      .then(async (response) => {
        const data = await response.json() as SharedTrip & { error?: string };
        if (!response.ok) throw new Error(data.error || "공유 여행을 불러오지 못했습니다.");
        setTrip(data);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [params.id]);

  return (
    <main className="shared-trip-page">
      <header className="shared-header"><a className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></a><a href="/planner">내 여행 새로 만들기 ↗</a></header>
      {!trip && !error && <section className="shared-loading"><span /><p>공유된 여행 계획을 불러오고 있습니다.</p></section>}
      {error && <section className="shared-error"><p className="section-kicker">SHARED TRIP</p><h1>이 여행 계획을 열 수 없습니다.</h1><p>{error}</p><a href="/planner">새 여행 만들기 →</a></section>}
      {trip && <>
        <section className="shared-hero"><div><p className="section-kicker">SHARED W.A.V.E ROUTE</p><h1>{trip.selections.region || "경남"}에서 만나는<br />장벽 없는 하루</h1><p>{trip.origin?.label || "선택 출발지"}에서 시작하는 맞춤 여행 계획입니다.</p><div><span>여행지 <b>{trip.plan.places.length}곳</b></span><span>공유 보관 <b>{new Date(trip.expiresAt).toLocaleDateString("ko-KR")}까지</b></span>{trip.plan.crowd && <span>집중률 <b>{trip.plan.crowd.rate.toFixed(1)}%</b></span>}</div></div></section>
        <section className="shared-content"><div className="shared-places">{trip.plan.places.map((place, index) => <article key={place.id}><div style={place.image ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(4,25,44,.7)), url("${place.image}")` } : undefined}><span>{String(index + 1).padStart(2, "0")}</span><b>{place.city}</b></div><section><h2>{place.name}</h2><p>{place.summary}</p><div>{place.features.slice(0, 3).map((feature) => <span key={feature}>✓ {feature}</span>)}</div><strong>{place.score}<small>W.A.V.E 적합도</small></strong></section></article>)}</div><aside><p className="section-kicker">ITINERARY</p><h2>여행 순서</h2><ol>{trip.plan.stops.map((stop, index) => <li key={`${stop.title}-${index}`}><span>{index + 1}</span><div><small>{stop.source}</small><h3>{stop.title}</h3><p>{stop.note}</p></div></li>)}</ol><a href={`/planner?region=${encodeURIComponent(trip.selections.region || "창원")}`}>이 조건으로 다시 설계하기 →</a></aside></section>
      </>}
    </main>
  );
}
