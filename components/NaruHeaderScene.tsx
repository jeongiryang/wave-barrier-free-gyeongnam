'use client';
import HandwrittenText from './HandwrittenText';
import NaruDialogueProfile from './NaruDialogueProfile';
import { useEffect, useRef, useState } from 'react';

const dialogue = [
  ['꼬마 여행자', '나루야, 공룡 보러 가고 싶어!'],
  ['나루', '좋아! 경남의 공룡 여행지를 찾아보자.'],
  ['꼬마 여행자', '걷다가 힘들면 쉬어 갈 수 있어?'],
  ['나루', '그럼! 쉬는 곳과 편의정보도 함께 확인하자.'],
];
/** One welcome sequence; the composed scenery keeps a fixed camera and character scale. */
export default function NaruHeaderScene() {
  const root = useRef<HTMLElement>(null);
  const [frame, setFrame] = useState(0), [visible, setVisible] = useState(false), [foreground, setForeground] = useState(true);
  const [reduced, setReduced] = useState(false), [ready, setReady] = useState(false);
  useEffect(() => {
    const images = Array.from(root.current?.querySelectorAll('img') || []);
    if (images.length && images.every(image => image.complete && image.naturalWidth > 0)) setReady(true);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const canObserve = typeof IntersectionObserver === 'function';
    const update = () => setReduced(!canObserve || media.matches || document.documentElement.dataset.motion === 'calm');
    const focus = () => setForeground(!document.hidden);
    update(); focus(); media.addEventListener('change', update); document.addEventListener('visibilitychange', focus);
    const settings = new MutationObserver(update);
    settings.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    const observer = canObserve ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .4 }) : null;
    if (root.current) observer?.observe(root.current);
    return () => { observer?.disconnect(); settings.disconnect(); media.removeEventListener('change', update); document.removeEventListener('visibilitychange', focus); };
  }, []);
  useEffect(() => {
    if (!visible || !foreground || reduced || !ready) return;
    const timer = setTimeout(() => setFrame(value => value === 4 ? 1 : value + 1), frame === 0 ? 1200 : frame === 2 ? 1800 : frame === 4 ? 2400 : 800);
    return () => clearTimeout(timer);
  }, [frame, visible, foreground, reduced, ready]);
  const shown = reduced ? 4 : frame;
  const scene = shown < 3 ? 0 : 1;
  const markReady = () => { if (Array.from(root.current?.querySelectorAll('img') || []).every(image => image.complete && image.naturalWidth > 0)) setReady(true); };
  const pair = shown < 3 ? 0 : 2;
  return <section ref={root} className="naru-welcome naru-header-scene" data-frame={shown} data-intro={shown === 0} aria-label="나루와 함께 여행 준비하기">
    <div className="scenic-background scenic-background-planner" aria-hidden="true">
      {[
        ['planner-harbor-grounded-v4.webp','planner-harbor-mobile-v1.webp'],
        ['planner-harbor-map-desktop-v1.webp','planner-harbor-map-mobile-v1.webp'],
      ].map(([desktop,mobile], index) => <picture key={desktop}><source media="(max-width:700px)" srcSet={`/naru/${mobile}`}/><img src={`/naru/${desktop}`} alt="" width="1536" height="1024" className={scene === index ? 'is-current' : ''} onLoad={markReady} /></picture>)}
    </div>
    <h2><HandwrittenText text="나루와 함께해요" playing={visible && foreground && ready} /></h2>
    <div className="naru-welcome-dialogue" role="group" aria-label="여행 대화 예시">{dialogue.slice(pair, pair + 2).map(([, text], i) => <p key={text} hidden={shown <= pair + i}><NaruDialogueProfile speaker={i ? 'naru' : 'child'} /><span className="naru-welcome-copy">{text}</span></p>)}</div>
  </section>;
}
