'use client';
import { useEffect, useRef, useState, useSyncExternalStore, type Ref } from 'react';
import NaruAvatar from './NaruAvatar';
import { useSitePreferences } from './SitePreferences';

const greetings = [
  { text: '여행 준비 맡겨보세요', prompt: '여행 준비를 맡기고 싶어요. 지역과 날짜부터 함께 정해주세요.' },
  { text: '사진 속 여행정보를 읽어드려요', prompt: '사진을 올려 여행정보를 확인하려면 어떻게 하나요?' },
  { text: '일정도 대화로 바꿀 수 있어요', prompt: '내 일정을 대화로 바꾸는 방법을 알려주세요.' },
  { text: '필요한 편의를 함께 확인해요', prompt: '내 여행에 필요한 편의시설을 함께 확인해주세요.' },
  { text: '저장한 여행을 이어서 준비해요', prompt: '저장한 여행을 이어서 준비하려면 어떻게 하나요?' },
];
const hintDismissalKey = 'wave-naru-hint-dismissed-v1';
const subscribeClientReady = () => () => undefined;
export default function NaruLauncher({ onOpen, context = '여행 설계', disabled = false, buttonRef, state = 'idle' }: { onOpen: (prompt?: string) => void; context?: string; disabled?: boolean; buttonRef?: Ref<HTMLButtonElement>; state?: string }) {
  const { motion } = useSitePreferences();
  const hydrated = useSyncExternalStore(subscribeClientReady, () => true, () => false);
  const unavailable = disabled || !hydrated;
  const [hint, setHint] = useState(-1), [dismissed, setDismissed] = useState(false);
  const discovery = useRef<HTMLElement>(null);
  useEffect(() => {
    let frame = 0, pointerActive = false;
    const beginPointer = () => { pointerActive = true; cancelAnimationFrame(frame); };
    const endPointer = () => { pointerActive = false; };
    const revealFocusedControl = () => {
      cancelAnimationFrame(frame);
      // Moving a pressed control before pointerup can send the click elsewhere.
      // Reveal keyboard and restored focus only outside an active pointer gesture.
      if (pointerActive) return;
      frame = requestAnimationFrame(() => {
        const target = document.activeElement;
        const launcher = discovery.current;
        if (pointerActive || !(target instanceof HTMLElement) || !launcher || launcher.contains(target) || !target.matches('a,button,input,select,textarea,summary')) return;
        const control = target.getBoundingClientRect(), floating = launcher.getBoundingClientRect();
        if (control.bottom > floating.top && control.top < floating.bottom && control.right > floating.left && control.left < floating.right) {
          target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        }
      });
    };
    document.addEventListener('pointerdown', beginPointer, true);
    window.addEventListener('pointerup', endPointer, true);
    window.addEventListener('pointercancel', endPointer, true);
    window.addEventListener('blur', endPointer);
    document.addEventListener('focusin', revealFocusedControl);
    window.addEventListener('resize', revealFocusedControl);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('pointerdown', beginPointer, true); window.removeEventListener('pointerup', endPointer, true); window.removeEventListener('pointercancel', endPointer, true); window.removeEventListener('blur', endPointer); document.removeEventListener('focusin', revealFocusedControl); window.removeEventListener('resize', revealFocusedControl); };
  }, []);
  useEffect(() => {
    if (unavailable || dismissed) return;
    try { if (sessionStorage.getItem(hintDismissalKey) === '1') return; } catch { /* The in-memory dismissal still works if storage is unavailable. */ }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      setHint(0);
      if (motion === 'calm' || reducedMotion.matches) return;
      timer = setInterval(() => {
        // A focused or pressed hint keeps its label and click destination stable.
        if (document.hidden || discovery.current?.matches(':hover, :focus-within')) return;
        setHint(current => (current + 1) % greetings.length);
      }, 3000);
    };
    start();
    reducedMotion.addEventListener('change', start);
    return () => { clearInterval(timer); reducedMotion.removeEventListener('change', start); };
  }, [context, unavailable, dismissed, motion]);
  const hide = () => { setHint(-1); setDismissed(true); try { sessionStorage.setItem(hintDismissalKey, '1'); } catch {} };
  const hintVisible = hint >= 0 && !dismissed && !unavailable;
  return <aside ref={discovery} className="naru-discovery" aria-label="나루 여행 도움">
    {hintVisible && <div className="naru-hint" aria-live="off"><button type="button" onClick={() => { hide(); onOpen(greetings[hint].prompt); }}>{greetings[hint].text}</button><button type="button" aria-label="나루 안내 그만 보기" onClick={hide}>×</button></div>}
    <button ref={buttonRef} data-state={state} className="naru-launcher" type="button" disabled={unavailable} aria-label="WAVE 여행 가이드 나루와 대화 열기" onClick={() => { hide(); onOpen(); }}><NaruAvatar state={hintVisible ? 'wave' : state} /></button>
  </aside>;
}
