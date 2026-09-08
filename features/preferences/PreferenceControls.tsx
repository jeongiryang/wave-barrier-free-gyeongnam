"use client";

import { useState, useSyncExternalStore } from "react";
import { useSitePreferences } from "./context";
import { localeOptions, motionCopy } from "./locale-catalog";
import type { Locale } from "./types";
import { useAppInstall } from "./useAppInstall";

const subscribeToHydration = () => () => undefined;
const browserReady = () => true;
const serverReady = () => false;

export function PreferenceControls({ onReplayIntro }: { onReplayIntro?: () => void } = {}) {
  const [replayCount, setReplayCount] = useState(0);
  const replayReady = useSyncExternalStore(subscribeToHydration, browserReady, serverReady);
  const { locale, theme, motion, systemReducedMotion, setLocale, toggleTheme, toggleMotion, t } = useSitePreferences();
  const en = locale === "en";
  const motionLabel = systemReducedMotion ? en ? "Motion reduced by your device settings" : "운영체제 설정에 따라 동작 효과 줄임" : motion === "calm" ? motionCopy[locale].on : motionCopy[locale].off;
  const appInstall = useAppInstall();

  return (
    <details className="preference-controls" inert={!replayReady} aria-busy={!replayReady} suppressHydrationWarning
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented || !event.currentTarget.open) return;
        event.preventDefault();
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }}
    >
      <summary aria-label={en ? "Open preferences" : "환경설정 열기"}>
        <span aria-hidden="true">Aa</span>
        <b>{en ? "Preferences" : "환경설정"}</b>
      </summary>
      <div className="preference-panel">
        <header>
          <b>{en ? "Preferences" : "환경설정"}</b>
          <small>{en ? "Adjust the screen for comfortable reading." : "읽기 편한 화면으로 조정합니다."}</small>
        </header>
        <label className="preference-row">
          <span><b>{t("language", "언어")}</b><small>{en ? "Some pages are in Korean" : "한국어 전체 지원"}</small></span>
          <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label={t("language", "언어")}>
            {localeOptions.map((item) => <option value={item.id} key={item.id}>{item.short} · {en && item.id === "ko" ? "Korean" : item.label}{item.beta ? en ? " · partial" : " · 부분 지원" : ""}</option>)}
          </select>
        </label>
        <button className="preference-row" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? t("light", "라이트모드") : t("dark", "다크모드")}>
          <span><b>{en ? "Appearance" : "화면 색상"}</b><small>{theme === "dark" ? en ? "Dark appearance" : "어두운 화면" : en ? "Light appearance" : "밝은 화면"}</small></span>
          <em aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</em>
        </button>
        <button className="preference-row motion-toggle" type="button" onClick={systemReducedMotion ? undefined : toggleMotion} aria-disabled={systemReducedMotion || undefined} aria-pressed={motion === "calm"} aria-label={motionLabel}>
          <span><b>{en ? "Motion" : "동작 효과"}</b><small>{systemReducedMotion ? en ? "Following device settings" : "운영체제 설정 적용 중" : motion === "calm" ? en ? "Reduced motion" : "효과 줄임" : en ? "Full motion" : "기본 효과"}</small></span>
          <em aria-hidden="true">{systemReducedMotion ? en ? "Device" : "OS" : motion === "calm" ? en ? "Reduced" : "정지" : en ? "Full" : "흐름"}</em>
        </button>
        {onReplayIntro && <button className="preference-row" type="button" disabled={!replayReady} onClick={() => { onReplayIntro(); setReplayCount((count) => count + 1); }} aria-label={en ? "Replay intro" : "인트로 다시보기"}>
          <span><b>{en ? "Replay intro" : "인트로 다시보기"}</b><small>{en ? "Keeps your focus and motion preferences" : "현재 초점과 동작 설정을 유지합니다"}</small></span>
          <em aria-hidden="true">↻</em>
        </button>}
        {onReplayIntro && <p role="status" aria-live="polite" aria-atomic="true">{replayCount > 0 ? (en ? "Intro shown again with your motion preferences." : "설정한 동작 효과로 인트로를 다시 표시했습니다.") : ""}{replayCount > 1 ? (en ? ` (${replayCount} replays)` : ` (${replayCount}회)`) : ""}</p>}
        {appInstall.state === "available" || appInstall.state === "installing" ? <button className="preference-row app-install" type="button" onClick={() => void appInstall.install()} disabled={appInstall.state === "installing"} aria-label={en ? "Install W.A.V.E" : "W.A.V.E 앱 설치"}>
          <span><b>{en ? "Install as an app" : "앱으로 설치"}</b><small>{en ? "Open from your home screen" : "홈 화면에서 전체 화면으로 열기"}</small></span>
          <em aria-hidden="true">{appInstall.state === "installing" ? en ? "Preparing" : "준비 중" : en ? "Install" : "설치"}</em>

        </button> : <div className="preference-row app-install-note">
          <span><b>{appInstall.state === "installed" ? en ? "App installed" : "앱 설치됨" : en ? "Add to home screen" : "홈 화면에 추가"}</b><small>{appInstall.state === "installed" ? en ? "Using your installed W.A.V.E app" : "현재 설치된 W.A.V.E로 이용 중" : en ? "Choose 'Add to home screen' in your browser menu." : "브라우저 메뉴에서 ‘홈 화면에 추가’를 선택하세요."}</small></span>
          <em aria-hidden="true">{appInstall.state === "installed" ? en ? "Done" : "완료" : en ? "Help" : "안내"}</em>
        </div>}
        <p>{en ? "Original place information and some features may appear in Korean. " : ""}{en ? "Your device's reduced motion preference is followed by default." : "운영체제의 동작 줄이기 설정을 기본으로 따릅니다."}</p>
      </div>
    </details>
  );
}
