import type { Locale, Motion, Theme } from "./types";
import { localeOptions } from "./locale-catalog";

export type StoredPreferences = {
  locale: Locale;
  theme: Theme;
  motion: Motion;
};

export function readStoredPreferences(): StoredPreferences {
  const systemTheme: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  try {
    const storedLocale = window.localStorage.getItem("wave-locale") as Locale | null;
    const storedTheme = window.localStorage.getItem("wave-theme") as Theme | null;
    const storedMotion = window.localStorage.getItem("wave-motion") as Motion | null;
    return {
      locale: storedLocale && localeOptions.some((item) => item.id === storedLocale) ? storedLocale : "ko",
      theme: storedTheme === "light" || storedTheme === "dark" ? storedTheme : systemTheme,
      // The OS setting is applied as a separate, stronger runtime constraint.
      // Keeping the user's own preference here lets it resume if the OS setting
      // is later turned off, instead of permanently overwriting it with "calm".
      motion: storedMotion === "full" || storedMotion === "calm" ? storedMotion : "full",
    };
  } catch {
    return { locale: "ko", theme: systemTheme, motion: "full" };
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
