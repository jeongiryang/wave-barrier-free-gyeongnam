"use client";

import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./LandingIntro.module.css";
const ApprovedIntro = lazy(() => import("../intro/wave-intro").then(module => ({ default: module.WaveIntro })));
class IntroBoundary extends Component<{children: ReactNode; onFailure: () => void}, {failed:boolean}> {
  state = {failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? <p className={styles.fallback}>모두의 발걸음이 닿는 경상남도</p> : this.props.children; }
}

/** PR #667 choreography, hosted in WAVE's session-scoped accessible dialog. */
export default function LandingIntro() {
  const dialog = useRef<HTMLDialogElement>(null);
  const finishRef = useRef<() => void>(() => {});
  const ready = useRef(false);
  const [active, setActive] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let playing = false;
    let previousOverflow = "";
    let returnFocus: HTMLElement | null = null;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (!playing) return;
      playing = false;
      clearTimeout(watchdog);
      node.close();
      setActive(false); setLeaving(false);
      document.documentElement.classList.remove("arrival-open");
      document.documentElement.style.overflow = previousOverflow;
      document.documentElement.dataset.introSeen = "1";
      try { sessionStorage.setItem("wave-arrival-session-v1", "done"); } catch { /* Session-only fallback. */ }
      const target = returnFocus?.isConnected && returnFocus.getClientRects().length ? returnFocus : document.querySelector<HTMLElement>("#top");
      target?.focus({preventScroll:true});
    };
    finishRef.current = finish;
    const start = (replay = false) => {
      if (playing) return;
      let seen = document.documentElement.dataset.introSeen === "1";
      try { seen ||= sessionStorage.getItem("wave-arrival-session-v1") === "done"; } catch { /* Do not block entry. */ }
      if (media.matches || document.documentElement.dataset.motion === "calm" || (!replay && (seen || window.scrollY > 24))) return;
      playing = true; ready.current = false;
      setLeaving(false);
      setGeneration(value=>value+1); setActive(true);
      returnFocus = replay && document.activeElement instanceof HTMLElement ? document.activeElement : null;
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      document.documentElement.classList.add("arrival-open");
      node.showModal();
      node.querySelector<HTMLButtonElement>("button[data-skip]")?.focus();
      // A failed import/context must never lock visitors out of the service.
      watchdog = setTimeout(()=>{ if (!ready.current) finish(); }, 8000);
    };
    const replay = () => start(true);
    const reduce = () => { if (media.matches) finish(); };
    start();
    window.addEventListener("wave-replay-intro", replay);
    media.addEventListener("change", reduce);
    return () => { finish(); clearTimeout(watchdog); window.removeEventListener("wave-replay-intro", replay); media.removeEventListener("change", reduce); };
  }, []);
  return <dialog ref={dialog} className={`${styles.scene} arrival-scene`} data-leaving={leaving} aria-label="WAVE 시작 이야기" onCancel={event=>{event.preventDefault(); finishRef.current();}} onKeyDown={event=>{
    if(event.key!=='Tab') return;
    const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
    const first=buttons[0],last=buttons.at(-1);
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
  }}>
    {active && <IntroBoundary key={generation} onFailure={()=>finishRef.current()}><Suspense fallback={<p className={styles.fallback}>WAVE</p>}><ApprovedIntro onReady={()=>{ready.current=true;}} onExitStart={()=>setLeaving(true)} onComplete={()=>finishRef.current()}/></Suspense></IntroBoundary>}
    <button type="button" className={styles.skip} data-skip onClick={()=>finishRef.current()}>건너뛰기</button>
  </dialog>;
}
