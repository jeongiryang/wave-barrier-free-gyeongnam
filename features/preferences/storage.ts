import type { Locale, Theme, Tone } from "./types";
import { localeOptions } from "./locale-catalog";
import { presentationOptionsEnabled } from "./presentation-release";

export type StoredPreferences = {
  locale: Locale;
  theme: Theme;
  tone: Tone;
};

/** 말투는 한국어 화면의 설정이므로 presentationOptionsEnabled() 게이트 밖에서 읽는다. */
function readStoredTone(): Tone {
  try {
    return window.localStorage.getItem("wave-tone-v1") === "gyeongnam" ? "gyeongnam" : "standard";
  } catch {
    return "standard";
  }
}

export function readStoredPreferences(): StoredPreferences {
  const tone = readStoredTone();
  if (!presentationOptionsEnabled()) return { locale: "ko", theme: "light", tone };
  const systemTheme: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  try {
    const storedLocale = window.localStorage.getItem("wave-locale") as Locale | null;
    const storedTheme = window.localStorage.getItem("wave-theme") as Theme | null;
    return {
      locale: storedLocale && localeOptions.some((item) => item.id === storedLocale) ? storedLocale : "ko",
      theme: storedTheme === "light" || storedTheme === "dark" ? storedTheme : systemTheme,
      tone,
    };
  } catch {
    return { locale: "ko", theme: systemTheme, tone };
  }
}

export function writeStoredPreferences(preferences: StoredPreferences) {
  try {
    if (presentationOptionsEnabled()) {
      window.localStorage.setItem("wave-theme", preferences.theme);
      window.localStorage.setItem("wave-locale", preferences.locale);
    }
    window.localStorage.setItem("wave-tone-v1", preferences.tone === "gyeongnam" ? "gyeongnam" : "standard");
    // Retire the old manual choice; only the OS/browser can reduce motion now.
    window.localStorage.removeItem("wave-motion");
  } catch {
    // 사생활 보호 설정이 저장소를 막으면 현재 탭의 설정만 유지한다.
  }
}
