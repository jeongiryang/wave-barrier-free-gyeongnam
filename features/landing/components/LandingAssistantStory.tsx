"use client";
import Link from 'next/link';
import { useState } from 'react';
import NaruAvatar from '../../../components/NaruAvatar';
import { useStoryPlayback } from '../hooks/useStoryPlayback';
import { useSitePreferences } from '../../../components/SitePreferences';

export default function LandingAssistantStory() {
  const en = useSitePreferences().locale === 'en';
  return <section id="naru" className="landing-naru" aria-labelledby="landing-naru-title" tabIndex={-1}>
    <div>
      <p className="horizon-eyebrow">WAVE AI GUIDE</p>
      <h2 id="landing-naru-title">{en ? <>Your words.<br />Your kind of trip.</> : <>여행의 시작을,<br /><em>나루와 이야기로.</em></>}</h2>
      <p>{en ? 'Tell Naru where you want to go and which facilities you need. Our AI guide helps you find places, arrange your itinerary, and review what to check before leaving.' : '가고 싶은 곳, 필요한 편의, 쉬어가고 싶은 마음까지. WAVE의 AI 여행 가이드 나루와 대화하며 여행지를 찾고 일정을 정리해 보세요.'}</p>
      <ul><li>{en ? 'Type or speak, at your own pace' : '글로도, 목소리로도 편하게'}</li><li>{en ? 'Review each change before applying it' : '바뀔 내용을 보고 직접 적용'}</li><li>{en ? 'Every planning tool, within the conversation' : '대화 안에서 모든 여행 도구 이용'}</li></ul>
      <Link href="/planner?assistant=naru" className="horizon-blue-button">{en ? 'Meet Naru' : '나루와 여행 시작하기'} <span aria-hidden="true">↗</span></Link>
    </div>
    <NaruDemo en={en} />
  </section>;
}

function NaruDemo({ en }: { en: boolean }) {
  const { motion } = useSitePreferences();
  const { root, index: playbackIndex, running } = useStoryPlayback(5, 2600);
  const [manual, setManual] = useState<number | null>(null);
  const steps = en ? ['Tourism data', 'Facility evidence', 'Weather', 'Itinerary', 'Journey map'] : ['관광 정보', '편의 근거', '날씨 확인', '일정 제안', '지도·이동'];
  const index = manual ?? (motion === 'calm' ? 4 : playbackIndex);
  const states = ['searching', 'checking', 'checking', 'planning', 'done'];
  const details = en ? [
    'Retrieve real venue IDs and visitor information from the Korea Tourism Organization.',
    'Keep the requested facilities. Mark anything not reported as unknown.',
    'Match available forecasts to the selected region and travel dates.',
    'Propose visit dates, an order and rest breaks while preserving fixed visits.',
    'Apply after review. Query the actual journey legs and keep unverified sections visible.',
  ] : [
    '한국관광공사의 실제 장소와 운영 정보를 찾아요.',
    '필요한 편의를 유지하고, 확인하지 못한 항목은 따로 표시해요.',
    '선택한 지역과 날짜의 예보를 확인해요. 먼 날짜는 예보가 없다고 안내해요.',
    '날짜·방문 순서·체류·휴식을 제안해요. 고정한 방문은 유지해요.',
    '확인 후 적용하면 실제 이동 구간을 조회해요. 미확인 이동도 분명하게 남겨요.',
  ];
  return <div ref={root} className="landing-naru-conversation" aria-label={en ? 'Naru planning example' : '나루 여행 설계 동작 예시'}>
    <header><NaruAvatar state={states[index]} /><div><strong>{en ? 'Naru from WAVE' : 'WAVE의 나루'}</strong><small>{en ? 'Your AI travel guide' : '나의 AI 여행 동행'}</small></div></header>
    <p className="landing-naru-user">{en ? 'Plan a rainy-day trip in Gyeongnam with wheelchair facilities.' : '비 오는 날 휠체어로 갈 수 있는 경남 여행 코스를 짜줘.'}</p>
    <div className="naru-demo-steps" role="group" aria-label={en ? 'Choose an example step' : '설명할 장면 선택'}>{steps.map((label, step) => <button type="button" key={label} aria-pressed={index === step} onClick={() => setManual(step)}><span>{step + 1}</span>{label}</button>)}</div>
    <div className="naru-demo-result"><strong>{steps[index]}</strong><p>{details[index]}</p>{index >= 3 && <div className="landing-naru-example"><span>{en ? 'Real venues' : '실제 장소'}</span><span>{en ? 'Rest breaks' : '중간중간 휴식'}</span><span>{en ? 'Undo changes' : '적용 되돌리기'}</span></div>}</div>
    {manual === null && running && <button className="naru-demo-pause" type="button" onClick={() => setManual(index)}>{en ? 'Pause example' : '설명 잠시 멈추기'}</button>}
    <small>{en ? 'An illustration of implemented features, not a live search. Availability depends on the source data.' : '현재 제공하는 기능을 보여주는 예시입니다. 실시간 조회 화면이 아니며, 장소와 편의는 실제 요청 시 다시 확인해요.'}</small>
    <Link href="/planner?assistant=naru&prompt=비%20오는%20날%20휠체어로%20갈%20수%20있는%20경남%20여행%20코스를%20짜줘">{en ? 'Try this request with Naru →' : '이 질문으로 나루와 시작하기 →'}</Link>
  </div>;
}
