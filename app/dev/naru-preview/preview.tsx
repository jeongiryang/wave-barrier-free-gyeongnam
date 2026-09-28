'use client';

import { useState } from 'react';
import NaruAvatar from '../../../components/NaruAvatar';
import NaruJourneyProposal from '../../../features/planner/components/NaruJourneyProposal';
import type { NaruJourney } from '../../../lib/naru-journey.js';
import type { Place } from '../../../features/planner/types';

const places: Place[] = [
  ['preview-coast', '바다를 바라보는 산책', 'coast-illustration.webp'],
  ['preview-garden', '정원에서 쉬어가기', 'garden-illustration.webp'],
  ['preview-indoor', '비 오는 날의 실내 여행', 'rain-illustration.webp'],
].map(([id, name, image]) => ({ id, name, image: `/media/demo/${image}`, contentTypeId: '', city: '화면 예시', address: '', summary: '화면 검토용 가상 장소', mapX: '', mapY: '', score: null, features: [], details: [], source: '화면 검토용 가상 장소 · 예시 일러스트' }));
const draft: NaruJourney = {
  action: 'create-itinerary', region: '경남', start: '2026-09-29', end: '2026-09-30', profiles: ['restroom'], themes: ['nature'], relaxed: true, transport: 'car', generatedAt: '2026-09-28T00:00:00Z', weather: null,
  warnings: ['이 미리보기의 장소와 그림은 화면 검토용 예시이며 실제 추천 결과가 아닙니다.'],
  stops: places.map((place, index) => ({ place, date: index < 2 ? '2026-09-29' : '2026-09-30', minutes: 60, breakMinutes: 20, reasons: ['쉬엄쉬엄 여행하는 카드 배치를 확인하는 예시입니다.'], unknown: index === 0 ? ['화장실 이용 조건'] : [] })),
  plan: { mode: 'fallback', generatedAt: '2026-09-28T00:00:00Z', baseYm: '202609', places, course: null, audio: null, stops: [], statuses: [] },
};

export default function NaruPreview() {
  const [applied, setApplied] = useState(false);
  return <main style={{ minHeight: '100dvh', padding: 16, background: '#0a1a30' }}>
    <section className="naru-panel naru-workspace naru-friendly" aria-label="나루 디자인 미리보기" style={{ position: 'relative', inset: 'auto', transform: 'none', margin: '0 auto', width: 'min(1220px, 100%)', maxWidth: '100%', height: 'calc(100dvh - 32px)', maxHeight: 'none', padding: 0, overflow: 'hidden', borderRadius: 24 }}>
      <div className="naru-conversation">
        <header className="naru-heading"><NaruAvatar /><div><strong>나루</strong><small>여행을 함께 설계하는 AI</small></div><a href="/planner?assistant=naru" style={{ marginLeft: 'auto', padding: 12 }}>실제 여행 설계로</a></header>
        <p className="naru-workspace-notice">로컬 디자인 미리보기 · 가상 장소와 예시 일러스트입니다. 버튼을 눌러도 실제 여행에는 저장되지 않아요.</p>
        <div className="naru-workspace-body">
          <aside className="naru-workspace-sidebar naru-trip-strip" aria-label="예시 여행 조건"><div className="naru-trip-strip-heading"><span>경남 · 09-29 — 09-30 · 쉬엄쉬엄 · 3곳</span></div></aside>
          <div className="naru-conversation-main"><div className="naru-log-viewport"><div className="naru-log">
            <div className="naru-message user"><p>이틀 동안 바다도 보고 편하게 쉬는 여행을 준비해줘.</p></div>
            <div className="naru-message assistant"><span className="naru-message-avatar"><NaruAvatar /></span><p>첫날은 바다와 정원, 둘째 날은 실내에서 여유롭게 둘러보는 일정이에요.</p><NaruJourneyProposal draft={draft} disabled={false} applied={applied} onApply={() => setApplied(true)} onExplore={() => {}} />
              {applied && <button type="button" onClick={() => setApplied(false)}>예시 적용 되돌리기</button>}
            </div>
          </div></div></div>
        </div>
      </div>
    </section>
  </main>;
}
