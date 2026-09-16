"use client";

import { useEffect, useRef } from "react";
import { horizonPhotos } from "../horizon-photos";
import styles from "./LandingIntro.module.css";

/** A short, dismissible welcome. All visual rules are isolated from the landing page. */
export default function LandingIntro() {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialog.current;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let seen = document.documentElement.dataset.introSeen === "1";
    try { seen ||= sessionStorage.getItem("wave-arrival-session-v1") === "done"; } catch { /* Keep the page available when storage is blocked. */ }
    if (!node || seen || media.matches || document.documentElement.dataset.motion === "calm" || window.scrollY > 24) return;

    let closed = false;
    const finish = () => {
      if (closed) return;
      closed = true;
      if (node.open) node.close();
      document.documentElement.dataset.introSeen = "1";
      try { sessionStorage.setItem("wave-arrival-session-v1", "done"); } catch { /* The in-memory marker still prevents a repeat. */ }
    };
    const reduce = () => { if (media.matches) finish(); };
    const hide = () => { if (document.hidden) finish(); };

    node.showModal();
    const timer = window.setTimeout(finish, 2000);
    media.addEventListener("change", reduce);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.clearTimeout(timer);
      media.removeEventListener("change", reduce);
      document.removeEventListener("visibilitychange", hide);
      finish();
    };
  }, []);

  const dismiss = () => {
    const node = dialog.current;
    if (!node) return;
    if (node.open) node.close();
    document.documentElement.dataset.introSeen = "1";
    try { sessionStorage.setItem("wave-arrival-session-v1", "done"); } catch { /* Do not block entry. */ }
  };

  return <dialog ref={dialog} className={`${styles.scene} arrival-scene`} aria-labelledby="wave-intro-message" onCancel={(event) => { event.preventDefault(); dismiss(); }}>
    <div className={`${styles.photo} arrival-picture`} aria-hidden="true"><img src={horizonPhotos.coast.image} alt="" decoding="async" /></div>
    <div className={styles.copy}>
      <span className="arrival-word" aria-hidden="true">WAVE</span>
      <p id="wave-intro-message">WAVE가 당신의 발걸음을 응원합니다</p>
    </div>
    <button type="button" className={styles.skip} onClick={dismiss}>건너뛰기</button>
  </dialog>;
}
