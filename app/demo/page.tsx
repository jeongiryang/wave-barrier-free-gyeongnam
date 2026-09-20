"use client";
import { useState } from 'react';
import { useSitePreferences } from '../../components/SitePreferences';
import WaveHeader from '../../components/WaveHeader';
import SiteFooter from '../../components/SiteFooter';
import DemoStories from '../../features/demo/DemoStories';
import { buildItinerarySchedule } from '../../features/planner/optimization/itinerary-schedule.js';
import '../../features/demo/demo.css';

const scenarios = [
  { title: '바다를 보며 천천히', description: '산책과 식사 사이에 쉬는 시간을 두는 예시', names: ['바다 산책길', '항구 식당', '해안 전시관'], visits: [60, 60, 90], facilities: ['단차 없는 입구', '휠체어 화장실', '장애인 주차구역'], image: '/media/demo/coast-illustration.webp' },
  { title: '비 오는 날의 실내 여행', description: '날씨가 바뀌었을 때 실내 장소를 고르는 예시', names: ['문화 전시관', '실내 정원', '북카페'], visits: [90, 60, 45], facilities: ['엘리베이터', '실내 휴게공간', '수유실'], image: '/media/demo/rain-illustration.webp' },
  { title: '함께 쉬어 가는 하루', description: '짧은 방문과 충분한 휴식을 배치하는 예시', names: ['작은 정원', '마을 식당', '풍경 쉼터'], visits: [45, 60, 45], facilities: ['유모차 진입로', '가족 화장실', '그늘 쉼터'], image: '/media/demo/garden-illustration.webp' },
];
export default function DemoPage() {
  const { hydrated } = useSitePreferences();
  const [index, setIndex] = useState(0);
  const [breaks, setBreaks] = useState<Record<string, number>>({});
  const [visits, setVisits] = useState<Record<string, number>>({});
  const [previous, setPrevious] = useState<{ breaks: Record<string, number>; visits: Record<string, number> } | null>(null);
  const [pending, setPending] = useState<'rest' | 'visit' | null>(null);
  const [notice, setNotice] = useState('');
  const scenario = scenarios[index];
  const places = scenario.names.map((name, i) => ({ id: `demo-${i}`, name: `가상 ${name}`, contentTypeId: '12', visitMinutes: scenario.visits[i] }));
  const day = buildItinerarySchedule({ places, days: ['시연 1일차'], startTime: '10:00', routeMinutesByPlaceId: { 'demo-0': 15, 'demo-1': 20, 'demo-2': 15 }, visitMinutesByPlaceId: visits, breakMinutesByPlaceId: breaks })[0];
  const select = (next: number) => { setIndex(next); setBreaks({}); setVisits({}); setPrevious(null); setPending(null); setNotice('다른 예시 여행을 열었습니다.'); };
  const apply = () => { setPrevious({ breaks, visits }); if (pending === 'rest') setBreaks({ ...breaks, 'demo-0': 20 }); else setVisits({ ...visits, 'demo-0': 90 }); setPending(null); setNotice('시연 시간표에 적용했습니다. 실제 여행은 변경되지 않았습니다.'); };
  return <><WaveHeader current="planner" /><main className="demo-page" id="demo-main"><header><span className="demo-badge">시연 모드</span><h1>예시 여행으로 먼저 해보세요</h1><p>가상 장소·편의시설·이동시간으로 구성했습니다. 실제 관광정보와 저장된 여행은 변경하지 않습니다.</p><a href="/planner">실제 여행 설계로 돌아가기 →</a></header>
    <div className="demo-scenarios" role="group" aria-label="시연 여행 선택">{scenarios.map((item,i) => <button disabled={!hydrated} key={item.title} aria-pressed={index===i} onClick={() => select(i)}>{item.title}</button>)}</div>
    <section className="demo-trip" aria-labelledby="demo-trip-title"><img className="demo-cover" src={scenario.image} alt="AI 생성 시연 삽화" width="768" height="512" /><div><h2 id="demo-trip-title">{scenario.title}</h2><p>{scenario.description}</p><p>10:00 출발 · 3곳 · {day.entries.at(-1)?.endsAtLabel} 종료</p><ul>{scenario.facilities.map(item => <li key={item}>{item} <span className="demo-badge">시연값</span></li>)}</ul><p><small>시설은 가상 예시이며 실제 장소의 이용 가능성을 뜻하지 않습니다.</small></p></div></section>
    <section aria-labelledby="demo-edit-title"><h2 id="demo-edit-title">일정을 바꿔 보세요</h2><p>실제 여행 설계와 같은 시간표 계산을 사용합니다. 변경안을 확인한 다음 적용할 수 있습니다.</p><div className="demo-actions"><button disabled={!hydrated} onClick={() => setPending('rest')}>첫 장소 뒤 20분 쉬기</button><button disabled={!hydrated} onClick={() => setPending('visit')}>첫 장소에서 90분 머물기</button><button disabled={!previous} onClick={() => { if(previous) { setBreaks(previous.breaks); setVisits(previous.visits); setPrevious(null); setNotice('이전 시연 시간표로 되돌렸습니다.'); } }}>되돌리기</button></div>
    {pending && <div className="demo-proposal" role="region" aria-label="시연 변경안"><h3>변경안</h3><p>{pending === 'rest' ? '첫 장소 뒤에 20분 휴식을 넣고 이후 시작 시각을 조정합니다.' : '첫 장소의 체류 시간을 90분으로 바꾸고 이후 시작 시각을 조정합니다.'} 장소 순서와 이동시간은 유지합니다.</p><button onClick={apply}>시연 일정에 적용</button><button disabled={!hydrated} onClick={() => setPending(null)}>취소</button></div>}
    <p role="status">{notice}</p><ol className="demo-timeline">{day.entries.map(entry => <li key={entry.place.id}><strong>{entry.startsAtLabel}</strong><div><h3>{entry.place.name}</h3><p>체류 {entry.visitMinutes}분 · 이동 {entry.travelMinutes}분{entry.breakMinutes ? ` · 휴식 ${entry.breakMinutes}분` : ''}</p><small>시설·운영시간·이동시간 모두 시연용 가정</small></div></li>)}</ol></section>
    <aside className="demo-proposal"><h2>나루와 실제 여행 만들기</h2><p>이 예시의 버튼은 기능 시연입니다. 실제 나루와 대화하려면 여행 설계에서 ‘나루와 계획하기’를 선택하세요.</p><a href="/planner">나루와 여행 설계하기 →</a></aside><DemoStories /></main><SiteFooter /></>;
}
