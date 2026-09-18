"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useSitePreferences } from "./context";
import { localeOptions } from "./locale-catalog";
import type { Locale, Tone } from "./types";
import { useAppInstall } from "./useAppInstall";
import { presentationOptionsEnabled } from "./presentation-release";
import { dialectToneEnabled } from "./tone-release";

const nextTone = (tone: Tone): Tone => (tone === "gyeongnam" ? "standard" : "gyeongnam");
/** 말투 이름은 표준 한국어 라벨이다. 조작의 이름에는 사투리를 쓰지 않는다. */
const toneName = (tone: Tone, en: boolean) => (tone === "gyeongnam" ? (en ? "Gyeongnam Korean" : "경남 말") : (en ? "standard Korean" : "표준말"));

const subscribeToHydration = () => () => undefined;
const browserReady = () => true;
const serverReady = () => false;

function positionPanel(details: HTMLDetailsElement | null) {
  if (!details?.open) return;
  const top = details.querySelector("summary")?.getBoundingClientRect().top;
  if (top === undefined) return;
  const bottom = Math.min(window.innerHeight - 96, Math.max(16, window.innerHeight - top + 10));
  details.style.setProperty("--preference-bottom", `${bottom}px`);
}

export function PreferenceControls({ iconOnly = false }: { iconOnly?: boolean }) {
  const controlsReady = useSyncExternalStore(subscribeToHydration, browserReady, serverReady);
  const { locale, theme, tone, setLocale, setTone, toggleTheme, t } = useSitePreferences();
  const en = locale === "en";
  const showPresentationOptions = controlsReady && presentationOptionsEnabled();
  // 사투리 응답 품질을 측정하기 전에는 말투 선택지를 감춘다(명세 28).
  const showDialectTone = controlsReady && dialectToneEnabled();
  const appInstall = useAppInstall();
  const disclosure = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const details = disclosure.current;
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) details.open = false;
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
    <details ref={disclosure} className="preference-controls" inert={!controlsReady} aria-busy={!controlsReady} suppressHydrationWarning
      onBlur={(event) => {
        // Label clicks temporarily blur to null before forwarding focus to the
        // native select. Hiding its parent here can crash Chromium's picker.
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}
      onToggle={(event) => positionPanel(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented || !event.currentTarget.open) return;
        event.preventDefault();
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }}
    >
      <summary title={en ? "Preferences" : "환경설정"} aria-label={en ? "Open preferences" : "환경설정 열기"}>
        {iconOnly ? <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m9 3-.6 2.4-2 .9-2.2-.7L2 9.4l1.8 1.7v1.8L2 14.6l2.2 3.8 2.2-.7 2 .9L9 21h6l.6-2.4 2-.9 2.2.7 2.2-3.8-1.8-1.7v-1.8L22 9.4l-2.2-3.8-2.2.7-2-.9L15 3Z"/><circle cx="12" cy="12" r="3.1"/></svg> : <><span aria-hidden="true">Aa</span><b>{en ? "Preferences" : "환경설정"}</b></>}
      </summary>
      <div className="preference-panel">
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
        {showDialectTone && <><button className="preference-row" type="button" data-preference="tone" onClick={() => setTone(tone === "gyeongnam" ? "standard" : "gyeongnam")}
          aria-label={en
            ? `Screen tone, currently ${toneName(tone, true)}. Switch to ${toneName(nextTone(tone), true)}.`
            : `화면 말투, 현재 ${toneName(tone, false)}. 눌러서 ${toneName(nextTone(tone), false)}로 바꾸기`}>
          <span><b>{en ? "Screen tone" : "화면 말투"}</b><small>{en ? "Only the tone of the Korean guidance changes. The information stays the same." : "안내 문구의 말투만 바뀌어요. 내용은 같아요."}</small></span>
          <em aria-hidden="true">{toneName(tone, en)}</em>
        </button>
        <div className="sr-only" role="status" aria-live="polite">{en ? `Screen tone is ${toneName(tone, true)}.` : `화면 말투는 ${toneName(tone, false)}입니다.`}</div></>}
        {appInstall.state === "available" || appInstall.state === "installing" ? <button className="preference-row app-install" type="button" onClick={() => void appInstall.install()} disabled={appInstall.state === "installing"} aria-label={en ? "Install WAVE" : "WAVE 앱 설치"}>
          <span><b>{en ? "Install as an app" : "앱으로 설치"}</b><small>{en ? "Open from your home screen" : "홈 화면에서 전체 화면으로 열기"}</small></span>
          <em aria-hidden="true">{appInstall.state === "installing" ? en ? "Preparing" : "준비 중" : en ? "Install" : "설치"}</em>

        </button> : <div className="preference-row app-install-note">
          <span><b>{appInstall.state === "installed" ? en ? "App installed" : "앱 설치됨" : en ? "Add to home screen" : "홈 화면에 추가"}</b><small>{appInstall.state === "installed" ? en ? "Using your installed WAVE app" : "현재 설치된 WAVE로 이용 중" : en ? "Choose 'Add to home screen' in your browser menu." : "브라우저 메뉴에서 ‘홈 화면에 추가’를 선택하세요."}</small></span>
          <em aria-hidden="true">{appInstall.state === "installed" ? en ? "Done" : "완료" : en ? "Help" : "안내"}</em>
        </div>}
        <p>{en ? "Original place information and some features may appear in Korean. " : ""}{en ? "Your device's reduced motion preference is followed by default." : "운영체제의 동작 줄이기 설정을 기본으로 따릅니다."}</p>
      </div>
    </details>
  );
}
