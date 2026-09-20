import type { SharedTrip } from "../types";
import { profiles } from "../../planner/constants";

export function SharedTripHero({ trip }: { trip: SharedTrip }) {
  const itineraryRegions = [...new Set(trip.plan.places.map(place => place.city).filter(Boolean))].join(' · ') || '경남';
  const activeProfiles = profiles.filter((profile) => trip.selections.profiles?.includes(profile.id));
  return <><section className="shared-hero"><div><p className="section-kicker">공유한 여행 계획</p><h1>{itineraryRegions} 여행 일정</h1><p>{trip.origin?.label ? `${trip.origin.label}에서 출발하는 여행입니다.` : "출발지는 공유하지 않은 일정입니다."}</p>{activeProfiles.length > 0 && <section className="shared-profile-summary" aria-label="이 여행에 적용한 편의조건"><small>사용자가 직접 선택한 편의조건</small><div>{activeProfiles.map((profile) => <span key={profile.id}>{profile.label}</span>)}</div><time dateTime={trip.plan.generatedAt}>계획 생성 {new Date(trip.plan.generatedAt).toLocaleString("ko-KR")}</time></section>}<div><span>여행지 <b>{trip.plan.places.length}곳</b></span><span>공유 보관 <b>{new Date(trip.expiresAt).toLocaleDateString("ko-KR")}까지</b></span>{trip.restoration?.requested ? <span>저장 장소 최신 확인 <b>{trip.restoration.restored}/{trip.restoration.requested}</b></span> : null}</div></div></section>{trip.restoration?.missing ? <p className="shared-restoration-notice" role="status">저장한 장소 {trip.restoration.missing}곳은 공식 관광정보에서 현재 확인되지 않아 화면에서 잠시 제외했습니다. 저장 기록은 유지되며, 다시 조회해 주세요.</p> : null}</>;
}

export function SharedTripPlaces({ trip }: { trip: SharedTrip }) {
  return <div className="shared-places">{trip.plan.places.map((place, index) => <article key={place.id}><div style={place.image ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(4,25,44,.7)), url("${place.image}")` } : undefined}><span>{String(index + 1).padStart(2, "0")}</span><b>{place.city}</b></div><section><h2>{place.name}</h2><p>{place.summary}</p><div>{place.features.slice(0, 3).map((feature) => <span key={feature}>✓ {feature}</span>)}</div><strong className="pending">방문 전 재확인<small>표시된 정보는 현장 접근 가능성을 보장하지 않습니다.</small></strong></section></article>)}</div>;
}
