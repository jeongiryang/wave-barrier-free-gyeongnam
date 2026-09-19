import type { ColorAssist, Locale, TextScale, Theme } from "./types";
import { localeOptions } from "./locale-catalog";
import { presentationOptionsEnabled } from "./presentation-release";

export type StoredPreferences = {
  locale: Locale;
  theme: Theme;
  textScale: TextScale;
  colorAssist: ColorAssist;
};

function isTextScale(value: unknown): value is TextScale {
  return value === "standard" || value === "large" || value === "larger";
}

/** Text size is an accessibility setting, so it is read outside the deferred
 * presentation gate that still hides language and theme. */
function readStoredTextScale(): TextScale {
  try {
    const stored = window.localStorage.getItem("wave-text-scale-v1");
    return isTextScale(stored) ? stored : "standard";
  } catch {
    return "standard";
  }
}

function readStoredColorAssist(): ColorAssist {
  try { return window.localStorage.getItem("wave-color-assist-v1") === "on" ? "on" : "off"; }
  catch { return "off"; }
}

export function readStoredPreferences(): StoredPreferences {
  const textScale = readStoredTextScale();
  const colorAssist = readStoredColorAssist();
  if (!presentationOptionsEnabled()) return { locale: "ko", theme: "light", textScale, colorAssist };
  const systemTheme: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  try {
    const storedLocale = window.localStorage.getItem("wave-locale") as Locale | null;
    const storedTheme = window.localStorage.getItem("wave-theme") as Theme | null;
    return {
      locale: storedLocale && localeOptions.some((item) => item.id === storedLocale) ? storedLocale : "ko",
      theme: storedTheme === "light" || storedTheme === "dark" ? storedTheme : systemTheme,
      textScale,
      colorAssist,
    };
  } catch {
    return { locale: "ko", theme: systemTheme, textScale, colorAssist };
  }
}

export function writeStoredPreferences(preferences: StoredPreferences) {
  try {
    if (presentationOptionsEnabled()) {
      window.localStorage.setItem("wave-theme", preferences.theme);
      window.localStorage.setItem("wave-locale", preferences.locale);
    }
    window.localStorage.setItem("wave-text-scale-v1", preferences.textScale);
    window.localStorage.setItem("wave-color-assist-v1", preferences.colorAssist);
    // Retire the old manual choice; only the OS/browser can reduce motion now.
    window.localStorage.removeItem("wave-motion");
  } catch {
    // 사생활 보호 설정이 저장소를 막으면 현재 탭의 설정만 유지한다.
  }
}
