'use client';
import NaruDialogueProfile from './NaruDialogueProfile';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
const dialogue = [['꼬마 여행자', '나루야, 공룡 보러 가고 싶어!'], ['나루', '좋아! 경남의 공룡 여행지를 함께 찾아보자.'], ['꼬마 여행자', '걷다가 힘들면 쉬어 갈 수 있어?'], ['나루', '그럼! 쉬는 시간과 편의정보도 함께 확인하자.']];
const frames = ['/naru/naru-512.webp', '/naru/conversation-hello.webp', '/naru/conversation-map.webp'];
export default function NaruHeaderScene() {
  const root = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState(0);
  const [visible, setVisible] = useState(false);
  const [foreground, setForeground] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [fontReady, setFontReady] = useState(false);
  const [ready, setReady] = useState<string[]>([]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const canObserve = typeof IntersectionObserver === 'function';
    const update = () => setReduced(media.matches || !canObserve);
    const focus = () => setForeground(!document.hidden);
    update(); focus(); media.addEventListener('change', update);
    document.addEventListener('visibilitychange', focus);
    const observer = canObserve ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .5 }) : null;
    if (root.current) observer?.observe(root.current);
    // Deliver fallback visibility after mount, like an observer notification.
    const fallbackFrame = !canObserve ? requestAnimationFrame(() => setVisible(true)) : null;
    let active = true;
    document.fonts.load('400 22px WaveHand', '나루와 함께해요').then(() => { if (active) setFontReady(true); }).catch(() => { if (active) setFontReady(true); });
    setReady(Array.from(root.current?.querySelectorAll('img') || []).filter(img => img.complete && img.naturalWidth > 0).map(img => img.getAttribute('src') || ''));
    return () => { active = false; if (fallbackFrame !== null) cancelAnimationFrame(fallbackFrame); observer?.disconnect(); media.removeEventListener('change', update); document.removeEventListener('visibilitychange', focus); };
  }, []);
  useEffect(() => {
    if (!visible || !foreground || reduced || !fontReady) return;
    const nextStep = (frame + 1) % 5;
    const next = nextStep === 0 ? 0 : nextStep < 3 ? 1 : 2;
    if (!ready.includes(frames[next])) return;
    const timer = setTimeout(() => setFrame(value => value + 1), 2000);
    return () => clearTimeout(timer);
  }, [frame, visible, foreground, reduced, fontReady, ready]);
  const shown = reduced ? 4 : frame % 5;
  const image = shown === 0 ? 0 : shown < 3 ? 1 : 2;
  const pair = shown < 3 ? 0 : 2;
  return <div ref={root} className="naru-header-scene" data-frame={shown} data-playing={visible && foreground && fontReady} aria-label="나루와 함께 여행 준비하기">
    <div className="naru-header-writing" key={reduced ? 'still' : Math.floor(frame / 5)}>{Array.from('나루와 함께해요').map((letter, i) => <span key={i} style={{ '--write-delay': `${i * 100}ms` } as CSSProperties}>{letter}</span>)}</div>
    <div className="naru-header-images" aria-hidden="true">{frames.map((src, i) => <img key={src} src={src} alt="" width={i ? 1536 : 512} height={i ? 1024 : 512} className={i === image ? 'is-visible' : ''} onLoad={() => setReady(previous => previous.includes(src) ? previous : [...previous, src])} />)}</div>
    <div className="naru-header-dialogue" aria-hidden={shown === 0}>{dialogue.slice(pair, pair + 2).map(([, text], i) => <div key={text} aria-hidden={shown <= pair + i} data-speaker={i ? "naru" : "child"} className={shown > pair + i ? "is-visible" : ""}><NaruDialogueProfile speaker={i ? "naru" : "child"} /><p>{text}</p></div>)}</div>
  </div>;
}
