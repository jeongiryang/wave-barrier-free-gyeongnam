"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RegionSound } from "../region-sound";

type Connection = EventTarget & { saveData?: boolean };

function AvailableRegionSoundPlayer({ sound }: { sound: RegionSound }) {
  const root = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const source = `region-sound:${sound.id}`;
  const [allowed, setAllowed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  const stop = useCallback((reset = true) => {
    const node = audio.current;
    if (!node) return;
    node.pause();
    if (reset) node.currentTime = 0;
    setPlaying(false);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const sync = () => {
      const next = !media.matches
        && document.documentElement.dataset.motion !== "calm"
        && connection?.saveData !== true;
      setAllowed(next);
      if (!next) {
        stop();
        const node = audio.current;
        if (node) { node.removeAttribute("src"); node.load(); }
      }
    };
    const preferences = new MutationObserver(sync);
    preferences.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    sync();
    media.addEventListener("change", sync);
    connection?.addEventListener("change", sync);
    return () => {
      preferences.disconnect();
      media.removeEventListener("change", sync);
      connection?.removeEventListener("change", sync);
    };
  }, [stop]);

  useEffect(() => {
    const node = audio.current;
    const stopWhenHidden = () => { if (document.hidden) stop(); };
    const stopForOtherSound = (event: Event) => {
      if ((event as CustomEvent<{ source?: string }>).detail?.source !== source) stop();
    };
    const stopForOtherAudio = (event: Event) => { if (event.target !== audio.current) stop(); };
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) stop(); });
    if (root.current) observer.observe(root.current);
    document.addEventListener("visibilitychange", stopWhenHidden);
    document.addEventListener("play", stopForOtherAudio, true);
    window.addEventListener("wave:audio-start", stopForOtherSound);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", stopWhenHidden);
      document.removeEventListener("play", stopForOtherAudio, true);
      window.removeEventListener("wave:audio-start", stopForOtherSound);
      stop();
      if (node) { node.removeAttribute("src"); node.load(); }
    };
  }, [source, stop]);

  async function play() {
    const node = audio.current;
    if (!allowed || !node || failed || playing) return;
    window.dispatchEvent(new CustomEvent("wave:audio-start", { detail: { source } }));
    node.volume = 0.3;
    if (!node.getAttribute("src")) node.src = sound.src;
    try { await node.play(); }
    catch { setFailed(true); setPlaying(false); }
  }

  if (!allowed) return null;
  const buttonStyle = { minHeight: 44, padding: "8px 16px", border: "1px solid var(--line)", borderRadius: 8, background: "var(--surface)", color: "var(--ink-soft)" };
  return <div data-region-sound-player ref={root} aria-label="지역 배경 소리" style={{ margin: "0 0 28px", color: "var(--ink-soft)" }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      <button style={buttonStyle} type="button" onClick={() => void play()} disabled={playing || failed}>{failed ? "지금은 들을 수 없어요." : "지역 소리 재생"}</button>
      <button style={buttonStyle} type="button" onClick={() => stop()} disabled={!playing}>정지</button>
      {playing && <span role="status">소리 재생 중</span>}
    </div>
    <p style={{ margin: "8px 0 0", color: "var(--muted)" }}><strong style={{ display: "block" }}>{sound.title}</strong><small style={{ display: "block", fontSize: ".75rem" }}>{sound.credit} · <a href={sound.licenseUrl} target="_blank" rel="noopener noreferrer">{sound.license}</a> · {sound.checkedOn} 확인</small></p>
    <audio style={{ display: "none" }} ref={audio} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => stop()} onError={() => { setFailed(true); setPlaying(false); }} />
  </div>;
}

export default function RegionSoundPlayer({ sound }: { sound?: RegionSound }) {
  if (!sound) return null;
  return <AvailableRegionSoundPlayer sound={sound} />;
}
