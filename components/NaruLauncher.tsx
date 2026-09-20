'use client';
import { useEffect, useRef, useState, type Ref } from 'react';
import NaruAvatar from './NaruAvatar';
import { useSitePreferences } from './SitePreferences';

const greetings = ['일정 변경은 나루에게 요청하세요.'];
export default function NaruLauncher({ onOpen, context = '여행 설계', disabled = false, buttonRef, state = 'idle' }: { onOpen: (prompt?: string) => void; context?: string; disabled?: boolean; buttonRef?: Ref<HTMLButtonElement>; state?: string }) {
  const { motion } = useSitePreferences();
  const [hint, setHint] = useState(-1), [dismissed, setDismissed] = useState(false);
  const discovery = useRef<HTMLElement>(null);
  useEffect(() => {
    let frame = 0;
    const revealFocusedControl = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = document.activeElement;
        const launcher = discovery.current;
        if (!(target instanceof HTMLElement) || !launcher || launcher.contains(target) || !target.matches('a,button,input,select,textarea,summary')) return;
        const control = target.getBoundingClientRect(), floating = launcher.getBoundingClientRect();
        if (control.bottom > floating.top && control.top < floating.bottom && control.right > floating.left && control.left < floating.right) {
          target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        }
      });
    };
    document.addEventListener('focusin', revealFocusedControl);
    window.addEventListener('resize', revealFocusedControl);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('focusin', revealFocusedControl); window.removeEventListener('resize', revealFocusedControl); };
  }, []);
  useEffect(() => {
    if (disabled || dismissed || motion === 'calm') return;
    let seen = false;
    try { seen = sessionStorage.getItem('wave-naru-introduced') === '1'; } catch { /* Session hints still have a bounded lifetime. */ }
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (!seen) {
      greetings.forEach((_, index) => timers.push(setTimeout(() => setHint(index), 5000 + index * 5000)));
      timers.push(setTimeout(() => { setHint(-1); try { sessionStorage.setItem('wave-naru-introduced', '1'); } catch {} }, 10000));
    }
    return () => timers.forEach(clearTimeout);
  }, [context, disabled, dismissed, motion]);
  const hide = () => { setHint(-1); setDismissed(true); try { sessionStorage.setItem('wave-naru-introduced', '1'); } catch {} };
  const hintVisible = hint >= 0 && !dismissed && !disabled && motion !== 'calm';
  return <aside ref={discovery} className="naru-discovery" aria-label="나루 여행 도움">
    {hintVisible && <div className="naru-hint"><button type="button" onClick={() => { hide(); onOpen(); }}>{greetings[hint]}</button><button type="button" aria-label="나루 안내 그만 보기" onClick={hide}>×</button></div>}
    <button ref={buttonRef} data-state={state} className="naru-launcher" type="button" disabled={disabled} aria-label="WAVE 여행 가이드 나루와 대화 열기" onClick={() => { hide(); onOpen(); }}><NaruAvatar state={hintVisible ? 'wave' : state} /></button>
  </aside>;
}
