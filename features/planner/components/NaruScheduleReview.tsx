'use client';
import { useEffect, useState } from 'react';
import LoadingState from '../../../components/LoadingState';
import { assessVisitHours, type VisitInfo } from '../../../lib/visit-hours.js';
import { fetchVisitInfo } from '../services/visit-info';
import type { Place } from '../types';

export type ReviewVisit = { place: Place; day: string; startsAt: number; endsAt: number; travelSource: string };
const reason: Record<string, string> = {
  'before-opening': '개장 전 도착', 'after-closing': '마감 후 도착', 'after-admission': '입장 마감 후 도착',
  'visit-overrun': '방문 중 운영 종료', 'closed-day': '등록된 휴무일', 'outside-event': '행사 기간 밖',
};
export default function NaruScheduleReview({ visits, onAlternative, onDetails }: { visits: ReviewVisit[]; onAlternative: (id: string) => void; onDetails: (place: Place) => void }) {
  const [info, setInfo] = useState<Record<string, VisitInfo | null>>({});
  const [loading, setLoading] = useState(true), [retry, setRetry] = useState(0);
  const ids = JSON.stringify(visits.map(visit => visit.place.id));
  useEffect(() => {
    let current = true, expired = false, cursor = 0;
    const next: Record<string, VisitInfo | null> = {};
    const requested = JSON.parse(ids) as string[];
    const deadline = setTimeout(() => { expired = true; if (current) { setInfo({ ...next }); setLoading(false); } }, 18000);
    const timer = setTimeout(() => {
      setLoading(true);
      // Two readers share one deadline; unavailable providers never create a minutes-long queue.
      void (async () => {
        const worker = async () => {
          while (current && !expired && cursor < requested.length) {
            const id = requested[cursor++];
            try { next[id] = await fetchVisitInfo(id); } catch { next[id] = null; }
          }
        };
        await Promise.all([worker(), worker()]);
        if (current && !expired) { clearTimeout(deadline); setInfo(next); setLoading(false); }
      })();
    }, 0);
    return () => { current = false; clearTimeout(timer); clearTimeout(deadline); };
  }, [ids, retry]);
  if (!visits.length) return <p>일정에 장소를 담으면 방문시간과 운영시간을 함께 확인해요.</p>;
  const checks = visits.map(visit => assessVisitHours(info[visit.place.id], visit));
  const conflicts = checks.filter(check => check.state === 'conflict').length;
  const unknown = checks.filter(check => check.state === 'unknown').length;
  return <section className="naru-schedule-review" aria-label="변경한 일정의 운영시간 확인" aria-live="polite">
    <h3>운영시간 다시 확인</h3>
    {loading ? <LoadingState>이후 장소의 운영시간을 확인하고 있어요.</LoadingState> : <>
      <p>{visits.length}곳 중 {conflicts}곳 일정 조정 필요 · {unknown}곳 정보 확인 필요</p>
      <details open={conflicts > 0 || undefined}><summary>장소별 확인 내용</summary>
      <ul>{visits.map(visit => {
        const source = info[visit.place.id];
        const check = assessVisitHours(source, visit);
        return <li key={visit.place.id}><strong>{visit.place.name}</strong><p>{visit.day || '날짜 미정'} · {check.state === 'within' ? '등록된 운영시간 안에 방문' : check.state === 'conflict' ? `${reason[check.reason] || '운영시간과 겹침'} · 일정 조정 필요` : source ? '시간·휴무 조건을 시설에 확인해 주세요' : '운영 정보를 불러오지 못했어요'}</p>
          {source && <small>{source.hours || '운영시간 미제공'} · {source.restDays || '휴무 정보 미제공'}<br />{source.source} · {source.checkedAt.slice(0, 10)} 조회</small>}
          <div><button type="button" onClick={() => onDetails(visit.place)}>이용 정보·문의</button>{check.state === 'conflict' && <button type="button" onClick={() => onAlternative(visit.place.id)}>같은 편의로 다른 장소 찾기</button>}</div>
        </li>;
      })}</ul>
      </details>
      {visits.some(visit => !info[visit.place.id]) && <button type="button" onClick={() => setRetry(value => value + 1)}>미확인 운영시간 다시 확인</button>}
      <small>예상 일정과 등록 정보의 비교입니다. {visits.some(visit => visit.travelSource !== 'route') ? '조회되지 않은 이동 구간은 추정값을 사용합니다. ' : ''}휴식 공간과 당일 변경은 시설에 확인해 주세요.</small>
    </>}
  </section>;
}
