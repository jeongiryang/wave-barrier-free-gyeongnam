import type { Locale, Motion, Theme } from "./types";
import { localeOptions } from "./translations";

export type StoredPreferences = {
  locale: Locale;
  theme: Theme;
  motion: Motion;
};

export function readStoredPreferences(): StoredPreferences {
  const systemTheme: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const systemMotion: Motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "calm" : "full";
  try {
    const storedLocale = window.localStorage.getItem("wave-locale") as Locale | null;
    const storedTheme = window.localStorage.getItem("wave-theme") as Theme | null;
    const storedMotion = window.localStorage.getItem("wave-motion") as Motion | null;
    return {
      locale: storedLocale && localeOptions.some((item) => item.id === storedLocale) ? storedLocale : "ko",
      theme: storedTheme === "light" || storedTheme === "dark" ? storedTheme : systemTheme,
      motion: storedMotion === "full" || storedMotion === "calm" ? storedMotion : systemMotion,
    };
  } catch {
    return { locale: "ko", theme: systemTheme, motion: systemMotion };
  }
}

export function writeStoredPreferences(preferences: StoredPreferences) {
  try {
    window.localStorage.setItem("wave-theme", preferences.theme);
    window.localStorage.setItem("wave-locale", preferences.locale);
    window.localStorage.setItem("wave-motion", preferences.motion);
  } catch {
    // 사생활 보호 설정이 저장소를 막으면 현재 탭의 설정만 유지한다.
  }
}

