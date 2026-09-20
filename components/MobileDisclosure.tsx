'use client';
import { useId, useState, useSyncExternalStore, type ReactNode } from 'react';

const subscribe = (update: () => void) => {
  const media = window.matchMedia('(max-width: 600px)');
  media.addEventListener('change', update);
  return () => media.removeEventListener('change', update);
};
const hydrationSubscribe = () => () => {};
const readySnapshot = () => true;
const serverReadySnapshot = () => false;
const compactSnapshot = () => window.matchMedia('(max-width: 600px)').matches;

/** One control tree: compact screens can fold secondary tools without losing state. */
export default function MobileDisclosure({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  const ready = useSyncExternalStore(hydrationSubscribe, readySnapshot, serverReadySnapshot);
  const compact = useSyncExternalStore(subscribe, compactSnapshot, () => false);
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return <div className={`mobile-disclosure ${className}`}>
    <button type="button" className="mobile-disclosure-toggle" disabled={!ready} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>{title}<span aria-hidden="true">{expanded ? '−' : '+'}</span></button>
    <div id={id} className="mobile-disclosure-content" hidden={compact && !expanded}>{children}</div>
  </div>;
}
