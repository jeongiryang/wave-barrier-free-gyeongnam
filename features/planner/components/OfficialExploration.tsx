'use client';
import { lazy, Suspense, useCallback, useState } from 'react';
import NightIcon from '../../../components/NightIcon';
import OfficialExplorationPhoto from './OfficialExplorationPhoto';
import type { OfficialCandidate } from './OfficialCandidateDialog';
import type { useTripSelection } from '../hooks/useTripSelection';
import type { PlanData, Place } from '../types';
const OfficialCandidateDialog = lazy(() => import('./OfficialCandidateDialog'));

export default function OfficialExploration({ plan, current, profiles, onPlace, trip }: { plan: PlanData | null; current: boolean; profiles: string[]; trip: ReturnType<typeof useTripSelection>; onPlace: (place: Place) => void }) {
  const [selected, setSelected] = useState<{ plan: PlanData; candidate: OfficialCandidate } | null>(null);
  const close = useCallback(() => setSelected(null), []);
  if (!plan || !current || (!plan.course && !plan.additionalExploration?.length)) return null;
  const course: OfficialCandidate | null = plan.course ? { ...plan.course, scope: plan.course.sigun, source: '두루누비' } : null;
  const details = (candidate: OfficialCandidate) => <div className="place-card-actions"><button className="place-card-info" type="button" onClick={() => setSelected({ plan, candidate })} data-icon-action="" aria-label={`${candidate.name} 상세정보`} title="자세히 보기"><NightIcon name="info" size={20}/></button><button className="simple-place-add" type="button" onClick={() => setSelected({ plan, candidate })} aria-label={`${candidate.name} 일정에 담기`} title="일정에 담기"><NightIcon name="plus" size={20}/></button></div>;
  return <section className="official-exploration" aria-label="걷기 코스·함께 살펴볼 관광지"><h2>걷기 코스·함께 살펴볼 관광지</h2>
    {course && <article className="official-exploration-card"><h3>{course.name}</h3><OfficialExplorationPhoto title={course.name} region={course.scope} /><p>{course.scope}</p>{details(course)}</article>}
    <div className="official-exploration-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 16 }}>{plan.additionalExploration?.map(item => <article className="official-exploration-card" key={`${item.source}:${item.scope}:${item.name}`}><h3>{item.name}</h3><OfficialExplorationPhoto title={item.name} region={item.scope} /><p>{item.scope}</p>{details(item)}</article>)}</div>
    {selected?.plan === plan && <Suspense fallback={<p role="status">상세정보를 열고 있어요.</p>}><OfficialCandidateDialog key={profiles.join(",")} candidate={selected.candidate} profiles={profiles} trip={trip} onClose={close} onPlace={onPlace}/></Suspense>}
  </section>;
}
