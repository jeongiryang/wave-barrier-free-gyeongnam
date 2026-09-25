'use client';
import NaruDialogueProfile from './NaruDialogueProfile';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import SiteFooter from './SiteFooter';
const lines = [
  ['꼬마 여행자', '나루야, 공룡 보러 가고 싶어!'],
  ['나루', '좋아! 경남의 공룡 여행지를 함께 찾아보자.'],
  ['꼬마 여행자', '걷다가 힘들면 쉬어 갈 수 있어?'],
  ['나루', '그럼! 쉬는 시간을 넣고, 필요한 편의정보도 함께 확인하자.'],
];
export default function NaruConversationFooter({ onOpen, onTools }: { onOpen: () => void; onTools: () => void }) {
  const root = useRef<HTMLElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [step, setStep] = useState(0);
  const [foreground, setForeground] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update(); query.addEventListener('change', update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    if (root.current) observer.observe(root.current);
    const arrival = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && entry.intersectionRatio >= .75) { setStarted(true); arrival.disconnect(); } }, { threshold: .75 });
    if (intro.current) arrival.observe(intro.current);
    const visibility = () => setForeground(!document.hidden);
    document.addEventListener('visibilitychange', visibility);
    let active = true;
    document.fonts.load('400 40px WaveHand', '나루와 함께해요').then(() => { if (active) setFontReady(true); }).catch(() => { if (active) setFontReady(true); });
    return () => { document.removeEventListener('visibilitychange', visibility); active = false; observer.disconnect(); arrival.disconnect(); query.removeEventListener('change', update); };
  }, []);
  useEffect(() => {
    if (!started || !visible || !foreground || reduced || !fontReady || !ready || step >= 4) return;
    const timer = setTimeout(() => { setStep(value => value + 1); }, 2000);
    return () => clearTimeout(timer);
  }, [started, visible, foreground, reduced, fontReady, ready, step]);
  const shown = reduced ? 4 : step;
  return <section ref={root} className="naru-conversation-footer" aria-labelledby="naru-story-title" data-step={shown} data-visible={visible} data-started={started} data-font-ready={fontReady && started && visible}>
    <div ref={intro} className="naru-conversation-intro"><h2 id="naru-story-title"><span className="sr-only">나루와 함께해요</span><span aria-hidden="true">{Array.from('나루와 함께해요').map((letter, i) => <span key={i} style={{ '--write-delay': `${i * 130}ms` } as CSSProperties}>{letter}</span>)}</span></h2><p>궁금한 여행을 이야기하면, 함께 준비해요.</p></div>
    <div className="naru-story-stage">
      <div className="naru-story-art" aria-hidden="true">
        <img className={shown === 0 ? 'is-visible naru-story-solo' : 'naru-story-solo'} src="/naru/naru-512.webp" alt="" width="512" height="512" loading="lazy" />
        <img className={shown > 0 && shown < 3 ? 'is-visible' : ''} src="/naru/conversation-hello.webp" alt="" width="1536" height="1024" loading="lazy" ref={node => { if (node?.complete) setReady(true); }} onLoad={() => setReady(true)} onError={() => setReady(true)} />
        <img className={shown >= 3 ? 'is-visible' : ''} src="/naru/conversation-map.webp" alt="" width="1536" height="1024" loading="lazy" />
      </div>
      <ol className="naru-story-dialogue" aria-label="나루와 나누는 여행 대화 예시">{lines.map(([, line], i) => <li key={line} data-speaker={i % 2 ? 'naru' : 'child'} className={shown > i ? 'is-visible' : ''} aria-hidden={shown <= i}><NaruDialogueProfile speaker={i % 2 ? "naru" : "child"} /><p>{line}</p></li>)}</ol>
    </div>
    <div className="naru-story-actions"><button type="button" className="wave-gradient-button" onClick={onOpen}>나루와 대화하기 ↗</button><button type="button" className="wave-gradient-button" onClick={onTools}>걷기·휴식 계획하기 ↗</button></div>
    <SiteFooter />
    <p className="naru-story-disclosure">나루와의 대화 예시예요. 캐릭터 장면은 AI로 만들었어요.</p>
  </section>;
}
