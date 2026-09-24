'use client';
import type { CSSProperties } from 'react';
import type { PlanData } from '../types';

const card: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: 16, border: '1px solid var(--line)', borderRadius: 12, overflowWrap: 'anywhere' };
export default function OfficialExploration({ plan, current }: { plan: PlanData | null; current: boolean }) {
  if (!plan || !current || (!plan.course && !plan.additionalExploration?.length)) return null;
  const search = (name: string, scope: string) => {
    const input = document.getElementById('direct-place-query');
    input?.scrollIntoView({ block: 'center', behavior: 'smooth' }); input?.focus();
    window.dispatchEvent(new CustomEvent('wave:search-official-candidate', { detail: `${scope} ${name}`.trim() }));
  };
  return <details className="official-exploration" style={{ marginTop: 24, padding: 20, border: '1px solid var(--line)', borderRadius: 16 }}><summary style={{ cursor: 'pointer', fontWeight: 700, minHeight: 44 }}>걷기 코스·함께 살펴볼 관광지</summary>
    <p>공식 코스와 월별 관광 통계에서 찾은 탐색 후보입니다. 이름으로 검색해 실제 장소·편의를 확인한 뒤 일정에 담아주세요. 걷기 난이도가 쉬워도 휠체어 통행을 보장하지는 않아요.</p>
    {plan.course && <article style={card}><h3>{plan.course.name}</h3><p>{plan.course.summary}</p><small>두루누비 · {plan.course.sigun || '지역 확인 필요'} · 거리 {plan.course.distance || '미제공'}{plan.course.distance ? 'km' : ''} · 소요시간 {plan.course.minutes || '미제공'}{plan.course.minutes ? '분' : ''} · 난이도 {plan.course.level}</small><button style={{ marginTop: 8, minHeight: 44 }} type="button" onClick={() => search(plan.course!.name, plan.course!.sigun)}>코스 이름으로 장소 찾기</button></article>}
    <div className="official-exploration-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', gap: 16 }}>{plan.additionalExploration?.map(item => <article style={card} key={`${item.source}:${item.scope}:${item.name}`}><h3>{item.name}</h3><p>{item.scope}{item.relatedTo ? ` · ${item.relatedTo} 연관 관광지` : ''}</p><small>{item.source} · 기준월 {/^[0-9]{6}$/.test(item.baseYm) ? `${item.baseYm.slice(0, 4)}-${item.baseYm.slice(4)}` : '미제공'}</small><button style={{ marginTop: 8, minHeight: 44 }} type="button" onClick={() => search(item.name, item.scope)}>이 관광지 검색</button></article>)}</div>
  </details>;
}
