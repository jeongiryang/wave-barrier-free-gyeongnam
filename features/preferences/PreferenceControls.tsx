"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useSitePreferences } from "./context";
import { localeOptions } from "./locale-catalog";
import type { Locale } from "./types";
import { useAppInstall } from "./useAppInstall";
import { presentationOptionsEnabled } from "./presentation-release";

const subscribeToHydration = () => () => undefined;
const browserReady = () => true;
const serverReady = () => false;

export function PreferenceControls({ iconOnly = false }: { iconOnly?: boolean }) {
  const controlsReady = useSyncExternalStore(subscribeToHydration, browserReady, serverReady);
  const { locale, theme, setLocale, toggleTheme, t } = useSitePreferences();
  const en = locale === "en";
  const showPresentationOptions = controlsReady && presentationOptionsEnabled();
  const appInstall = useAppInstall();
  const disclosure = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const details = disclosure.current;
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) details.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  return (
    <details ref={disclosure} className="preference-controls" inert={!controlsReady} aria-busy={!controlsReady} suppressHydrationWarning
      onBlur={(event) => {
        // Label clicks temporarily blur to null before forwarding focus to the
        // native select. Hiding its parent here can crash Chromium's picker.
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
      }}
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
