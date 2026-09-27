'use client';
import { useEffect, useRef, useState, useSyncExternalStore, type Ref } from 'react';
import NaruAvatar from './NaruAvatar';
import NightIcon from './NightIcon';

const hintKey = 'wave-naru-welcome-session-dismissed';
let hintDismissed = false;
function readDismissed() { try { return hintDismissed || sessionStorage.getItem(hintKey) === 'yes'; } catch { return hintDismissed; } }
function subscribeHint(notify: () => void) { window.addEventListener(hintKey, notify); return () => window.removeEventListener(hintKey, notify); }
const hints = ['언제든 나루에게 물어보세요. 함께 여행을 준비해요.', '어디로 떠날까? 가고 싶은 곳을 함께 골라보자!', '걷는 시간, 쉬는 시간도 너에게 맞춰볼까?', '내가 만든 일정은 네가 확인하고 적용할 수 있어.'];

const subscribeClientReady = () => () => undefined;
export default function NaruLauncher({ onOpen, context = '여행 설계', disabled = false, buttonRef, state = 'idle' }: { onOpen: (prompt?: string) => void; context?: string; disabled?: boolean; buttonRef?: Ref<HTMLButtonElement>; state?: string }) {
  const hydrated = useSyncExternalStore(subscribeClientReady, () => true, () => false);
  const unavailable = disabled || !hydrated;
  const dismissed = useSyncExternalStore(subscribeHint, readDismissed, () => true);
  const [hint, setHint] = useState(0);
  const [reading, setReading] = useState(false);
  const showHint = !dismissed && !unavailable;
  const dismissHint = () => { hintDismissed = true; try { sessionStorage.setItem(hintKey, 'yes'); } catch { /* Keep closed in this document if tab storage is unavailable. */ } window.dispatchEvent(new Event(hintKey)); };
  useEffect(() => {
    if (!showHint || reading) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const timer = setInterval(() => { if (!document.hidden && !media.matches && document.documentElement.dataset.motion !== 'calm') setHint(value => (value + 1) % hints.length); }, 5000);
    return () => clearInterval(timer);
  }, [showHint, reading]);
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
        const bubble = launcher.querySelector(".naru-welcome-bubble")?.getBoundingClientRect();
        const top = Math.min(floating.top, bubble?.top ?? floating.top), left = Math.min(floating.left, bubble?.left ?? floating.left);
        if (control.bottom > top && control.top < floating.bottom && control.right > left && control.left < floating.right) {
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
  return <aside ref={discovery} className="naru-discovery" aria-label="나루 여행 도움">
    {showHint && <div className="naru-welcome-bubble" onMouseEnter={() => setReading(true)} onMouseLeave={() => setReading(false)} onFocusCapture={() => setReading(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setReading(false); }}>
      <button className="naru-welcome-message" type="button" onClick={() => onOpen()}><span key={hint}>{hints[hint]}</span></button>
      <button className="naru-welcome-close" type="button" aria-label="나루 안내 잠시 닫기" title="닫기" onClick={dismissHint}><NightIcon name="close" size={18}/></button>
    </div>}
    <button ref={buttonRef} data-state={showHint ? 'wave' : state} className="naru-launcher" type="button" disabled={unavailable} aria-label="WAVE 여행 가이드 나루와 대화 열기" title={`${context} · 나루`} onClick={() => onOpen()}><NaruAvatar key={showHint ? hint : 'idle'} state={showHint ? 'wave' : state} /></button>
  </aside>;
}
