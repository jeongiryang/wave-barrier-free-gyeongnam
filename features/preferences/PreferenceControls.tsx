"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useSitePreferences } from "./context";
import { localeOptions } from "./locale-catalog";
import type { Locale, TextScale, Tone } from "./types";
import NightIcon from "../../components/NightIcon";
import { StatusShapeIcon } from "../../components/AccessIcons";
import { presentationOptionsEnabled } from "./presentation-release";
import { hapticsSupported } from "../../lib/haptics.js";

/** 세 단계는 루트 font-size 백분율로만 준다. 실제 크기를 함께 적어 고르게 한다. */
const textScaleOptions: Array<{ id: TextScale; label: string; english: string; size: string; phrase: string }> = [
  { id: "standard", label: "기본", english: "Standard", size: "16px", phrase: "기본으로" },
  { id: "large", label: "크게", english: "Large", size: "18px", phrase: "크게로" },
  { id: "larger", label: "아주 크게", english: "Larger", size: "20px", phrase: "아주 크게로" },
];
import { dialectToneEnabled } from "./tone-release";

const nextTone = (tone: Tone): Tone => (tone === "gyeongnam" ? "standard" : "gyeongnam");
/** 말투 이름은 표준 한국어 라벨이다. 조작의 이름에는 사투리를 쓰지 않는다. */
const toneName = (tone: Tone, en: boolean) => (tone === "gyeongnam" ? (en ? "Gyeongnam Korean" : "경남 말") : (en ? "standard Korean" : "표준말"));

const subscribeToHydration = () => () => undefined;
const browserReady = () => true;
const serverReady = () => false;

function positionPanel(details: HTMLDivElement | null) {
  if (details?.dataset.open !== "true") return;
  const top = details.querySelector(".preference-trigger")?.getBoundingClientRect().top;
  if (top === undefined) return;
  const bottom = Math.min(window.innerHeight - 96, Math.max(16, window.innerHeight - top + 10));
  details.style.setProperty("--preference-bottom", `${bottom}px`);
}

export function PreferenceControls({ iconOnly = false }: { iconOnly?: boolean }) {
  const controlsReady = useSyncExternalStore(subscribeToHydration, browserReady, serverReady);
  const { locale, theme, colorAssist, setColorAssist, textScale, setTextScale, setLocale, toggleTheme, tone, setTone, haptics, setHaptics, t } = useSitePreferences();
  const en = locale === "en";
  const showPresentationOptions = controlsReady && presentationOptionsEnabled();
  // 진동을 지원하지 않는 브라우저에서는 항목 자체를 그리지 않는다.
  // 언어·테마와 달리 presentationOptionsEnabled() 게이트를 적용하지 않는다.
  const showHaptics = controlsReady && hapticsSupported();
  const showDialectTone = controlsReady && dialectToneEnabled();
  const disclosure = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (open) positionPanel(disclosure.current); }, [open]);
  const [colorAssistNotice, setColorAssistNotice] = useState("");
  const [textScaleNotice, setTextScaleNotice] = useState("");

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const details = disclosure.current;
      if (event.target instanceof Node && !details?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    const reposition = () => positionPanel(disclosure.current);
    const observer = new ResizeObserver(reposition);
    if (disclosure.current?.parentElement) observer.observe(disclosure.current.parentElement);
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("scroll", reposition, true);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={disclosure} data-open={open} className="preference-controls" inert={!controlsReady} aria-busy={!controlsReady} suppressHydrationWarning
      onBlur={(event) => {
        // Label clicks temporarily blur to null before forwarding focus to the
        // native select. Hiding its parent here can crash Chromium's picker.
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented || !open) return;
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }}
    >
      <button type="button" className="preference-trigger" ref={trigger} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} title={en ? "Preferences" : "환경설정"} aria-label={en ? "Open preferences" : "환경설정 열기"}>
        {iconOnly ? <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m9 3-.6 2.4-2 .9-2.2-.7L2 9.4l1.8 1.7v1.8L2 14.6l2.2 3.8 2.2-.7 2 .9L9 21h6l.6-2.4 2-.9 2.2.7 2.2-3.8-1.8-1.7v-1.8L22 9.4l-2.2-3.8-2.2.7-2-.9L15 3Z"/><circle cx="12" cy="12" r="3.1"/></svg> : <><NightIcon name="settings" /><b>{en ? "Preferences" : "환경설정"}</b></>}
      </button>
      {open && <div className="preference-panel" id={panelId}>
        <div className="preference-panel-heading">
          <b>{en ? "Preferences" : "환경설정"}</b>
          <small>{en ? "Adjust the screen for comfortable reading." : "읽기 편한 화면으로 조정합니다."}</small>
        </div>
        {showPresentationOptions && <><label className="preference-row">
          <span><b>{t("language", "언어")}</b><small>{en ? "Some pages are in Korean" : "한국어 전체 지원"}</small></span>
          <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label={t("language", "언어")}>
            {localeOptions.map((item) => <option value={item.id} key={item.id}>{item.short} · {en && item.id === "ko" ? "Korean" : item.label}{item.beta ? en ? " · partial" : " · 부분 지원" : ""}</option>)}
          </select>
        </label>
        <button className="preference-row" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? t("light", "라이트모드") : t("dark", "다크모드")}>
          <span><b>{en ? "Appearance" : "화면 색상"}</b><small>{theme === "dark" ? en ? "Dark appearance" : "어두운 화면" : en ? "Light appearance" : "밝은 화면"}</small></span>
          <em aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</em>
        </button></>}
        <div className="preference-row preference-text-scale">
          <span><b>{en ? "Text size" : "글자 크기"}</b><small>{en ? "Enlarges text on every screen" : "모든 화면의 글자를 키웁니다"}</small><small aria-live="polite">{textScaleNotice}</small></span>
          <div role="radiogroup" aria-label={en ? "Text size" : "글자 크기"}>
            {textScaleOptions.map((item) => <label key={item.id}>
              <input type="radio" name="wave-text-scale" value={item.id} checked={textScale === item.id}
                onChange={() => {
                  setTextScale(item.id);
                  setTextScaleNotice(en ? `Text size changed to ${item.english}.` : `글자 크기를 ${item.phrase} 바꿨어요.`);
                }} />
              <b>{en ? item.english : item.label}</b><small>{item.size}</small>
            </label>)}
          </div>
        </div>
        <button className="preference-row" type="button" aria-pressed={colorAssist === "on"} onClick={() => {
          const next = colorAssist === "on" ? "off" : "on";
          setColorAssist(next);
          setColorAssistNotice(next === "on"
            ? en ? "Colour-free cues are on." : "색 구분 보조를 켰어요."
            : en ? "Colour-free cues are off." : "색 구분 보조를 껐어요.");
        }}>
          <span><b>{en ? "Colour-free cues" : "색 구분 보조"}</b><small>{en ? "Show status with words and shapes as well as colour." : "시설 정보의 확인·없음·미확인을 글자와 도형으로 구분해요."}</small></span>
          <em aria-hidden="true">{colorAssist === "on" ? en ? "On" : "켜짐" : en ? "Off" : "꺼짐"}</em>
        </button>
        <div className="color-assist-preview" aria-label={en ? "Facility status preview" : "시설 상태 표시 미리보기"}>
          <small>{en ? "Preview" : "표시 예시"}</small>
          <span><StatusShapeIcon kind="confirmed" />{en ? "Confirmed" : "확인"}</span>
          <span><StatusShapeIcon kind="negative" />{en ? "Unavailable" : "없음"}</span>
          <span><StatusShapeIcon kind="unknown" />{en ? "Unknown" : "미확인"}</span>
        </div>
        <span className="sr-only" role="status" aria-live="polite">{colorAssistNotice}</span>
        {showHaptics && <button className="preference-row" type="button" data-haptics={haptics} aria-pressed={haptics === "on"} onClick={() => setHaptics(haptics === "on" ? "off" : "on")}>
          <span><b>{en ? "Vibration alerts" : "진동 알림"}</b><small>{en ? "A short vibration at important moments. It may not work on some devices." : "중요한 순간에 짧게 진동해요. 기기에 따라 동작하지 않을 수 있어요."}</small></span>
          <em aria-hidden="true">{haptics === "on" ? en ? "On" : "켜짐" : en ? "Off" : "꺼짐"}</em>
        </button>}
        {showDialectTone && <><button className="preference-row" type="button" data-preference="tone" onClick={() => setTone(tone === "gyeongnam" ? "standard" : "gyeongnam")}
          aria-label={en
            ? `Screen tone, currently ${toneName(tone, true)}. Switch to ${toneName(nextTone(tone), true)}.`
            : `화면 말투, 현재 ${toneName(tone, false)}. 눌러서 ${toneName(nextTone(tone), false)}로 바꾸기`}>
          <span><b>{en ? "Screen tone" : "화면 말투"}</b><small>{en ? "Only the tone of the Korean guidance changes. The information stays the same." : "안내 문구의 말투만 바뀌어요. 내용은 같아요."}</small></span>
          <em aria-hidden="true">{toneName(tone, en)}</em>
        </button>
        <div className="sr-only" role="status" aria-live="polite">{en ? `Screen tone is ${toneName(tone, true)}.` : `화면 말투는 ${toneName(tone, false)}입니다.`}</div></>}
        <p>{en ? "Original place information and some features may appear in Korean. " : ""}{en ? "Your device's reduced motion preference is followed by default." : "운영체제의 동작 줄이기 설정을 기본으로 따릅니다."}</p>
      </div>}
    </div>
  );
}
