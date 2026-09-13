'use client';
import { useEffect, useState } from 'react';
import NaruAvatar from './NaruAvatar';
import { useSitePreferences } from './SitePreferences';

const greetings = ['안녕하세요. 여행을 함께 계획할까요?', '필요한 시설을 찾아드릴게요.', '쉬는 시간을 일정에 넣어보세요.', '글로 쓰거나 마이크로 요청할 수 있어요.', '사용법이 궁금하면 저를 눌러주세요.'];
export default function NaruLauncher({ onOpen, context = '여행 설계', disabled = false }: { onOpen: (prompt?: string) => void; context?: string; disabled?: boolean }) {
  const { motion } = useSitePreferences();
  const [hint, setHint] = useState(-1), [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (disabled || dismissed || motion === 'calm') return;
    let seen = false;
    try { seen = sessionStorage.getItem('wave-naru-introduced') === '1'; } catch { /* Session hints still have a bounded lifetime. */ }
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (!seen) {
      greetings.forEach((_, index) => timers.push(setTimeout(() => setHint(index), 5000 + index * 5000)));
      timers.push(setTimeout(() => { setHint(-1); try { sessionStorage.setItem('wave-naru-introduced', '1'); } catch {} }, 30000));
    } else {
      timers.push(setTimeout(() => setHint(5), 15000));
      timers.push(setTimeout(() => setHint(-1), 20000));
    }
    return () => timers.forEach(clearTimeout);
  }, [context, disabled, dismissed, motion]);
  const hide = () => { setHint(-1); setDismissed(true); try { sessionStorage.setItem('wave-naru-introduced', '1'); } catch {} };
  const hintVisible = hint >= 0 && !dismissed && !disabled && motion !== 'calm';
  return <aside className="naru-discovery" aria-label="나루 여행 도움">
    {hintVisible && <div className="naru-hint"><button type="button" onClick={() => { hide(); onOpen(); }}>{hint < 5 ? greetings[hint] : `${context}을 보면서 여행에 대해 물어보세요.`}</button><button type="button" aria-label="나루 안내 그만 보기" onClick={hide}>×</button></div>}
    <button className="naru-launcher" type="button" disabled={disabled} aria-label="WAVE 여행 가이드 나루와 대화 열기" onClick={() => { hide(); onOpen(); }}><NaruAvatar state={hintVisible ? 'wave' : 'idle'} /></button>
  </aside>;
}
