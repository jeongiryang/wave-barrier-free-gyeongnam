import type { Haptics, Locale, Theme } from "./types";
import { localeOptions } from "./locale-catalog";
import { presentationOptionsEnabled } from "./presentation-release";

export type StoredPreferences = {
  locale: Locale;
  theme: Theme;
  haptics: Haptics;
};

/** 진동 설정은 언어·테마의 공개 보류 게이트와 무관하게 읽고 쓴다. */
function readStoredHaptics(): Haptics {
  try {
    return window.localStorage.getItem("wave-haptics-v1") === "on" ? "on" : "off";
  } catch {
    // 저장소가 막히면 기본값 끄기로 동작한다.
    return "off";
  }
}

export function readStoredPreferences(): StoredPreferences {
  const haptics = readStoredHaptics();
  if (!presentationOptionsEnabled()) return { locale: "ko", theme: "light", haptics };
  const systemTheme: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  try {
    const storedLocale = window.localStorage.getItem("wave-locale") as Locale | null;
    const storedTheme = window.localStorage.getItem("wave-theme") as Theme | null;
    return {
      locale: storedLocale && localeOptions.some((item) => item.id === storedLocale) ? storedLocale : "ko",
      theme: storedTheme === "light" || storedTheme === "dark" ? storedTheme : systemTheme,
      haptics,
    };
  } catch {
    return { locale: "ko", theme: systemTheme, haptics };
  }
}

export function writeStoredPreferences(preferences: StoredPreferences) {
  try {
    if (presentationOptionsEnabled()) {
      window.localStorage.setItem("wave-theme", preferences.theme);
      window.localStorage.setItem("wave-locale", preferences.locale);
    }
    // 진동 설정은 게이트 밖에서 저장한다. 이 값은 서버나 계정으로 나가지 않는다.
    window.localStorage.setItem("wave-haptics-v1", preferences.haptics);
    // Retire the old manual choice; only the OS/browser can reduce motion now.
    window.localStorage.removeItem("wave-motion");
  } catch {
    // 사생활 보호 설정이 저장소를 막으면 현재 탭의 설정만 유지한다.
  }
}
