"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NaruAvatar from '../../../components/NaruAvatar';
import usePreviewPlayback from './usePreviewPlayback';

const exchanges = [
  { question: '부모님과 천천히 쉬어가는 여행을 하고 싶어요.', answer: '좋아요. 걷는 시간과 쉬는 시간을 함께 살펴볼게요. 어디로 떠날까요?', region: '지역 고르기', companion: '부모님과', pace: '여유롭게' },
  { question: '통영으로요. 하루 동안 다녀오고 싶어요.', answer: '통영 당일 여행을 준비해볼게요. 가고 싶은 장소를 담으면 이동 경로와 편의정보를 함께 확인할 수 있어요.', region: '통영', companion: '부모님과', pace: '당일 여행' },
  { question: '걷는 시간을 줄이고 중간에 쉬고 싶어요.', answer: '쉬어갈 시간을 넣는 변경안을 보여드릴게요. 마음에 드는지 확인한 뒤 일정에 적용해 주세요.', region: '통영', companion: '부모님과', pace: '걷기는 짧게 · 휴식은 넉넉히' },
];
export default function LandingChatPreview({ framed = false }: { framed?: boolean }) {
  const { ref: previewRef, frame } = usePreviewPlayback(6, 2400, false);
  const [history, setHistory] = useState([{ frame: 0, key: 0 }]);
  useEffect(() => {
    if (!framed) return;
    const animation=requestAnimationFrame(()=>setHistory(current => current[current.length - 1].frame === frame ? current : [...current, { frame, key: current[current.length - 1].key + 1 }].slice(-4)));
    return ()=>cancelAnimationFrame(animation);
  }, [frame, framed]);
  const round = Math.floor(frame / 2);
  const item = exchanges[round];
  if (framed) return <div ref={previewRef} className="restored-naru-preview" aria-label="여행 준비 대화 예시">
    <header><span><NaruAvatar /><strong>나루</strong></span><Link href="/planner?assistant=naru">나루와 내 여행 만들기 →</Link></header>
    <div className="restored-naru-body"><div className="restored-naru-messages" aria-live="off">{history.map(message => { const traveler = message.frame % 2 === 0; const exchange = exchanges[Math.floor(message.frame / 2)]; return <div key={message.key} className={`restored-chat-row ${traveler ? 'traveler' : 'naru'}`}>{traveler ? <i className="story-dialogue-portrait" aria-hidden="true"/> : <NaruAvatar />}<div><small>{traveler ? '꼬마여행자' : '나루'}</small><p className={traveler ? 'restored-naru-question' : undefined}>{traveler ? exchange.question : exchange.answer}</p></div></div>; })}</div></div>
  </div>;
  return <div ref={previewRef} className="landing-floating-dialogue" aria-label="여행 준비 예시 대화" aria-live="off">
    <div key={`question-${round}`} className="landing-floating-message traveler">
      <span className="landing-traveler-avatar" aria-hidden="true">☺</span>
      <div><small>여행자</small><p>{item.question}</p></div>
    </div>
    {frame % 2 === 1 && <div key={`answer-${round}`} className="landing-floating-message naru">
      <NaruAvatar /><div><small>나루</small><p>{item.answer}</p></div>
    </div>}
  </div>;
}