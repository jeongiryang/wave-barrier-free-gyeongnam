"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./LandingIntro.module.css";

const messages = ["모두의 여행이 같은 출발선에 설 수 있도록", "경남의 특별한 순간을 만나고", "여행의 이야기를 함께 나눕니다", "WAVE가 당신의 발걸음을 응원합니다"];
const chapters = ['여행 설계', '경남의 축제', 'WAVE 커뮤니티', '함께, WAVE'];
const DURATION = 10400;

/** Reuses PR #466's halftone particle renderer inside the current native modal. */
export default function LandingIntro() {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const finishRef = useRef<() => void>(() => {});
  const [stage, setStage] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposeRenderer: (() => void) | undefined;
    let timers: number[] = [];
    let generation = 0;
    let active = false;
    let previousOverflow = "";
    let returnFocus: HTMLElement | null = null;
    const clear = () => { timers.forEach(window.clearTimeout); timers = []; disposeRenderer?.(); disposeRenderer = undefined; generation += 1; };
    const finish = () => {
      if (!active) return;
      active = false;
      clear();
      node.close();
      // Reset while hidden so replay never reverses the exit fade over the page.
      setLeaving(false);
      document.documentElement.classList.remove("arrival-open");
      document.documentElement.style.overflow = previousOverflow;
      document.documentElement.dataset.introSeen = "1";
      try { sessionStorage.setItem("wave-arrival-session-v1", "done"); } catch { /* Session-only memory remains available. */ }
      const target = returnFocus?.isConnected && returnFocus.getClientRects().length ? returnFocus : document.querySelector<HTMLElement>("#top");
      target?.focus({ preventScroll: true });
    };
    finishRef.current = finish;
    const start = (replay = false) => {
      if (active) return;
      let seen = document.documentElement.dataset.introSeen === "1";
      try { seen ||= sessionStorage.getItem("wave-arrival-session-v1") === "done"; } catch { /* Do not block entry. */ }
      if (media.matches || document.documentElement.dataset.motion === "calm" || (!replay && (seen || window.scrollY > 24))) return;
      active = true;
      setStage(0); setLeaving(false);
      returnFocus = replay && document.activeElement instanceof HTMLElement ? document.activeElement : null;
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      document.documentElement.classList.add("arrival-open");
      node.showModal();
      node.querySelector<HTMLButtonElement>("button")?.focus();
      const ownGeneration = ++generation;
      import("../../motion/wave-field-engine").then(({ startWaveFieldRenderer }) => {
        if (active && ownGeneration === generation && canvas.current) disposeRenderer = startWaveFieldRenderer(canvas.current, { tone: "deep", mode: "intro", wordmark: "WAVE", motion: "full" });
      }).catch(() => { /* The gradient stage and its text remain usable. */ });
      for (let index = 1; index < 4; index++) timers.push(window.setTimeout(() => setStage(index), index * 2500));
      timers.push(window.setTimeout(() => setLeaving(true), 9800), window.setTimeout(finish, DURATION));
    };
    const replay = () => start(true);
    const reduce = () => { if (media.matches) finish(); };
    const hide = () => { if (document.hidden) finish(); };
    start();
    window.addEventListener("wave-replay-intro", replay);
    media.addEventListener("change", reduce);
    document.addEventListener("visibilitychange", hide);
    return () => { finish(); clear(); window.removeEventListener("wave-replay-intro", replay); media.removeEventListener("change", reduce); document.removeEventListener("visibilitychange", hide); };
  }, []);

  return <dialog ref={dialog} className={`${styles.scene} arrival-scene`} data-stage={stage} data-leaving={leaving} aria-label="WAVE 시작 이야기" onCancel={event => { event.preventDefault(); finishRef.current(); }}>
    <div className={styles.horizon} aria-hidden="true"><i/><i/><i/></div>
    <canvas ref={canvas} className={styles.particles} aria-hidden="true" />
    <div className={styles.copy} aria-live="polite" aria-atomic="true"><span className={styles.chapter}>{chapters[stage]}</span><p key={stage} data-final={stage === 3}>{messages[stage]}</p><span className="sr-only">{stage + 1} / 4 장면</span></div>
    <span className={`${styles.progress} arrival-word`} aria-hidden="true">WAVE · {String(stage + 1).padStart(2, "0")} / 04</span>
    <button type="button" className={styles.skip} onClick={() => finishRef.current()}>건너뛰기</button>
  </dialog>;
}
