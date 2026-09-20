"use client";
import { useState } from 'react';
import { Spinner } from '../../../components/LoadingState';
import { assessDepartureReadiness } from '../../../lib/departure-assessment.js';
import type { usePlannerParticipation } from '../hooks/usePlannerParticipation';
import type { useTripSelection } from '../hooks/useTripSelection';
import type { PlanData, WeatherData } from '../types';
import { localDate } from '../utils';
// 정적으로 불러온다: 목록 자체가 정적 데이터라서 새 네트워크 요청이 없다.
import EquipmentRentalList from './EquipmentRentalList';
import EvidenceCoverageCard from './EvidenceCoverageCard';
import { useReadinessFocus } from '../hooks/useReadinessFocus';
interface DepartureReadinessCardProps {
  embedded?: boolean;
  region: string;
  plan: PlanData | null;
  placeCriteriaCurrent: boolean;
  canRefreshPlaces: boolean;
  placesLoading: boolean;
  destinationCrowd?: PlanData["crowd"];
  destinationPlaceId?: string;
  weather: WeatherData | null;
  weatherLoading: boolean;
  routeCoverage: { total: number; verified: number; loading: boolean };
  tripSelection: ReturnType<typeof useTripSelection>;
  participation: ReturnType<typeof usePlannerParticipation>;
  onRefresh: () => void | Promise<void>;
  onOpenSignals: (target: "layers" | "crowd") => void;
}

export default function DepartureReadinessCard({ region, plan, placeCriteriaCurrent, placesLoading, destinationCrowd, destinationPlaceId, weather, weatherLoading, routeCoverage, tripSelection: trip, onRefresh, onOpenSignals }: DepartureReadinessCardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const focus = useReadinessFocus();
  const assessment = assessDepartureReadiness({ locale: 'ko', travelStart: trip.travelStart, today: localDate(), weather, weatherLoading, crowd: destinationCrowd || plan?.crowd, crowdPlaceId: destinationCrowd ? destinationPlaceId : undefined, scheduleAssignments: trip.scheduleAssignments, generatedAt: plan?.generatedAt, routeCoverage, places: trip.orderedSavedPlaces, placeCriteriaCurrent, currentPlaceIds: [...(plan?.places || []), ...(plan?.explorationPlaces || []), ...(plan?.excludedPlaces || [])].map(place => place.id), requiredFacilityKeys: plan?.criteria?.facilityKeys });
  const loading = refreshing || weatherLoading || placesLoading;
  return <section {...focus} className="simple-readiness" lang="ko" aria-label="출발 전 확인할 정보"><div className="simple-readiness-heading"><p>방문 날짜의 날씨와 장소별 이용 정보를 확인하세요.</p><button type="button" disabled={!region} aria-disabled={loading || !region} aria-busy={loading} onClick={async () => { if (loading || !region) return; setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } }}>{loading ? <><Spinner />불러오는 중</> : '다시 조회'}</button></div>
    <EvidenceCoverageCard places={trip.orderedSavedPlaces} requiredKeys={plan?.criteria?.facilityKeys || []} />
    {assessment.items.map(item => <details key={item.id}><summary><strong>{item.label}</strong><span>{item.state === 'confirmed' ? '조회한 정보 있음' : item.state === 'partial' ? '일부 정보 있음' : '확인할 정보 있음'}</span><span aria-hidden="true">⌄</span></summary><div><p>{item.subject ? `${item.subject} · ` : ''}{item.summary}</p><small>{item.source}{item.checkedAt ? ` · ${item.checkedAt}` : ''}</small><a href={item.href} onClick={event => { if (['#layers','#crowd'].includes(item.href) && !event.ctrlKey && !event.metaKey) { event.preventDefault(); onOpenSignals(item.href === '#crowd' ? 'crowd' : 'layers'); } }}>상세 정보 확인 →</a></div></details>)}
    <details><summary><strong>보조기기</strong><span aria-hidden="true">⌄</span></summary><div><p>휠체어 등 보조기기가 고장 나면 빌릴 수 있는 곳을 미리 확인해 두세요.</p><EquipmentRentalList region={region || null} /></div></details>
  </section>;
}
