"use client";
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import NaruAvatar from '../../../components/NaruAvatar';
import NightIcon from '../../../components/NightIcon';
import usePreviewPlayback from './usePreviewPlayback';
import './landing-previews.css';

const exchanges = [
  { question: '부모님과 천천히 쉬어가는 여행을 하고 싶어요.', answer: '좋아요. 걷는 시간과 쉬는 시간을 함께 살펴볼게요. 어디로 떠날까요?', region: '지역 고르기', companion: '부모님과', pace: '여유롭게' },
  { question: '통영으로요. 하루 동안 다녀오고 싶어요.', answer: '통영 당일 여행을 준비해볼게요. 가고 싶은 장소를 담으면 이동 경로와 편의정보를 함께 확인할 수 있어요.', region: '통영', companion: '부모님과', pace: '당일 여행' },
  { question: '걷는 시간을 줄이고 중간에 쉬고 싶어요.', answer: '쉬어갈 시간을 넣는 변경안을 보여드릴게요. 마음에 드는지 확인한 뒤 일정에 적용해 주세요.', region: '통영', companion: '부모님과', pace: '걷기는 짧게 · 휴식은 넉넉히' },
];
export default function LandingChatPreview() {
  const { ref: previewRef, frame } = usePreviewPlayback(6, 1000, false);
  const log = useRef<HTMLDivElement>(null);
  const round = Math.floor(frame / 2);
  const selected = exchanges[round];
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [frame]);
  return <div ref={previewRef} className="wave-chat-demo" aria-label="나루 대화 미리보기" data-frame={frame}>
    <header><span className="preview-naru-mark"><NaruAvatar key={frame} state={round===0?"wave":"done"}/></span><div><strong>나루</strong></div><Link className="preview-trip-link" href="/planner">나루와 내 여행 만들기 <NightIcon name="arrow" size={18}/></Link></header>
    <div className="wave-chat-demo-body"><div className="preview-messages" ref={log} aria-live="off" tabIndex={0} aria-label="여행 준비 예시 대화">
      {exchanges.slice(0, round + 1).map((item, index) => <div className="preview-exchange" key={item.question}>
        <p className="preview-question"><span className="sr-only">여행자: </span>{item.question}</p>
        {(index < round || frame % 2 === 1) && <p className="preview-answer"><span className="sr-only">나루: </span>{item.answer}</p>}
      </div>)}
    </div><aside><strong>함께 준비하는 여행</strong><dl><dt>지역</dt><dd>{selected.region}</dd><dt>동행</dt><dd>{selected.companion}</dd><dt>여행 방식</dt><dd>{selected.pace}</dd></dl></aside></div>
  </div>;
}
