"use client";

import { useSitePreferences } from "./context";
import { localeOptions, motionCopy } from "./locale-catalog";
import type { Locale } from "./types";
import { useAppInstall } from "./useAppInstall";

export function PreferenceControls() {
  const { locale, theme, motion, setLocale, toggleTheme, toggleMotion, t } = useSitePreferences();
  const motionLabel = motion === "calm" ? motionCopy[locale].on : motionCopy[locale].off;
  const selectedLocale = localeOptions.find((item) => item.id === locale) ?? localeOptions[0];
  const appInstall = useAppInstall();

  return (
    <details className="preference-controls" suppressHydrationWarning>
      <summary aria-label="환경설정 열기">
        <span aria-hidden="true">Aa</span>
        <b>환경설정</b>
      </summary>
      <div className="preference-panel">
        <header>
          <b>환경설정</b>
          <small>읽기 편한 화면으로 조정합니다.</small>
        </header>
        <label className="preference-row">
          <span><b>{t("language", "언어")}</b><small>{selectedLocale.beta ? "핵심 화면 부분 번역 · Beta" : "한국어 전체 지원"}</small></span>
          <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label={t("language", "언어")}>
            {localeOptions.map((item) => <option value={item.id} key={item.id}>{item.short} · {item.label}{item.beta ? " · Beta" : ""}</option>)}
          </select>
        </label>
        <button className="preference-row" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? t("light", "라이트모드") : t("dark", "다크모드")}>
          <span><b>화면 색상</b><small>{theme === "dark" ? "어두운 화면" : "밝은 화면"}</small></span>
          <em aria-hidden="true">{theme === "dark" ? "☀" : "◐"}</em>
        </button>
        <button className="preference-row motion-toggle" type="button" onClick={toggleMotion} aria-pressed={motion === "calm"} aria-label={motionLabel}>
          <span><b>동작 효과</b><small>{motion === "calm" ? "효과 줄임" : "기본 효과"}</small></span>
          <em aria-hidden="true">{motion === "calm" ? "정지" : "흐름"}</em>
        </button>
        {appInstall.state === "available" || appInstall.state === "installing" ? <button className="preference-row app-install" type="button" onClick={() => void appInstall.install()} disabled={appInstall.state === "installing"} aria-label="W.A.V.E 앱 설치">
          <span><b>앱으로 설치</b><small>홈 화면에서 전체 화면으로 열기</small></span>
          <em aria-hidden="true">{appInstall.state === "installing" ? "준비 중" : "설치"}</em>
        </button> : <div className="preference-row app-install-note">
          <span><b>{appInstall.state === "installed" ? "앱 설치됨" : "홈 화면에 추가"}</b><small>{appInstall.state === "installed" ? "현재 설치된 W.A.V.E로 이용 중" : "브라우저 메뉴에서 ‘홈 화면에 추가’를 선택하세요."}</small></span>
          <em aria-hidden="true">{appInstall.state === "installed" ? "완료" : "안내"}</em>
        </div>}
        <p>{selectedLocale.beta ? "관광지 원문과 일부 기능은 한국어로 표시될 수 있습니다. " : ""}운영체제의 동작 줄이기 설정을 기본으로 따릅니다.</p>
      </div>
    </details>
  );
}
