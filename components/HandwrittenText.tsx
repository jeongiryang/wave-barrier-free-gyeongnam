'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

export default function HandwrittenText({ text, playing = true, viewportSelector }: { text: string; playing?: boolean; viewportSelector?: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false), [visible, setVisible] = useState(false);
  useEffect(() => {
    let active = true;
    document.fonts.load('400 32px WaveHand', text).then(() => { if (active) setReady(true); }).catch(() => { if (active) setReady(true); });
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer?.disconnect(); } }, { threshold: .4 }) : null;
    if (root.current) observer?.observe(viewportSelector ? root.current.closest(viewportSelector) || root.current : root.current);
    if (!observer) queueMicrotask(() => { if (active) setVisible(true); });
    return () => { active = false; observer?.disconnect(); };
  }, [text, viewportSelector]);
  return <span ref={root} className="wave-written-line" data-writing={ready && visible && playing}><span className="sr-only">{text.replaceAll('\n', ' ')}</span><span aria-hidden="true">{Array.from(text).map((letter, index) => letter === '\n' ? <br key={index} /> : <span className="wave-written-character" key={index} style={{ '--write-delay': `${index * 100}ms` } as CSSProperties}>{letter}</span>)}</span></span>;
}
