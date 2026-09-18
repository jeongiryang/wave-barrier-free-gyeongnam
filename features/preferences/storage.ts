import type { ColorAssist, Locale, Theme } from "./types";
import { localeOptions } from "./locale-catalog";
import { presentationOptionsEnabled } from "./presentation-release";

export type StoredPreferences = {
  locale: Locale;
  theme: Theme;
  colorAssist: ColorAssist;
};

/** 접근성 설정은 언어·테마와 달리 공개 게이트 밖에서 항상 읽고 쓴다. */
function readStoredColorAssist(): ColorAssist {
  try {
    return window.localStorage.getItem("wave-color-assist-v1") === "on" ? "on" : "off";
  } catch {
    return "off";
  }
}

export function readStoredPreferences(): StoredPreferences {
  const colorAssist = readStoredColorAssist();
  if (!presentationOptionsEnabled()) return { locale: "ko", theme: "light", colorAssist };
  const systemTheme: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  try {
    const storedLocale = window.localStorage.getItem("wave-locale") as Locale | null;
    const storedTheme = window.localStorage.getItem("wave-theme") as Theme | null;
    return {
      locale: storedLocale && localeOptions.some((item) => item.id === storedLocale) ? storedLocale : "ko",
      theme: storedTheme === "light" || storedTheme === "dark" ? storedTheme : systemTheme,
      colorAssist,
    };
  } catch {
    return { locale: "ko", theme: systemTheme, colorAssist };
  }
}

export function writeStoredPreferences(preferences: StoredPreferences) {
  try {
    window.localStorage.setItem("wave-color-assist-v1", preferences.colorAssist);
  } catch {
    // 저장소가 막히면 현재 탭의 설정만 유지한다. 오류 문구를 띄우지 않는다.
  }
  try {
    if (presentationOptionsEnabled()) {
      window.localStorage.setItem("wave-theme", preferences.theme);
      window.localStorage.setItem("wave-locale", preferences.locale);
    }
    // Retire the old manual choice; only the OS/browser can reduce motion now.
    window.localStorage.removeItem("wave-motion");
  } catch {
    // 사생활 보호 설정이 저장소를 막으면 현재 탭의 설정만 유지한다.
  }
}
